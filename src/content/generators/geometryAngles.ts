/**
 * Geometry, level 1: Angles.
 *
 * Three lessons: angles made by lines (a straight line, a full turn, the four
 * kinds of angle, angles written with x), parallel lines (vertically opposite,
 * corresponding, alternate and co-interior angles), and the angles of a
 * triangle. Every figure is drawn to its own numbers and labels each angle
 * the question needs, with the one asked for in the accent colour as `x`.
 *
 * Figures come from `geometryKit.ts`; typed slides and number options from
 * the Contest Math helpers, which already do exactly this.
 */
import type { ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import { num, numberBank, numberOptions, say, typed } from './contestMath';
import {
  type Pt,
  DASHED,
  SVG_CLOSE,
  angle,
  choiceSlide,
  cornerAngle,
  deg,
  dot,
  fit,
  outline,
  parallelArrows,
  seg,
  svgOpen,
  text,
  ticks,
  toward,
  triangleFromAngles,
  word,
} from './geometryKit';

const diagram = (svg: string) => ({ kind: 'diagram' as const, svg });

/** Angle sizes in order round a vertex, the one at `ask` unknown, the rest labelled. */
function fan(v: Pt, start: number, sizes: number[], ask: number, labels?: string[]): string {
  const out: string[] = [];
  let at = start;
  for (let i = 0; i < sizes.length; i += 1) {
    // Neighbouring wedges alternate in size, so where they meet they stay two angles, not one disc.
    out.push(angle(v, at, sizes[i], i === ask ? 'x' : (labels?.[i] ?? deg(sizes[i])), { unknown: i === ask, r: i % 2 ? 27 : 19 }));
    at += sizes[i];
  }
  return out.join('');
}

/* ================================================================
 * Lesson 1: Angles Made by Lines
 * ================================================================ */

/* ---------- what kind of angle ---------- */

type Kind = 'acute' | 'right' | 'obtuse' | 'reflex';

const kindOf = (a: number): Kind => (a < 90 ? 'acute' : a === 90 ? 'right' : a < 180 ? 'obtuse' : 'reflex');

interface KindParams {
  a: number;
  /** Direction of the first arm. */
  from: number;
}

export function kindSvg({ a, from }: KindParams): string {
  const v: Pt = [150, 110];
  return [
    svgOpen(220, `An angle of ${a} degrees`),
    seg(v, toward(v, from, 95)),
    seg(v, toward(v, from + a, 95)),
    angle(v, from, a, deg(a), { square: a === 90, r: a > 180 ? 18 : undefined }),
    dot(v),
    SVG_CLOSE,
  ].join('');
}

const KIND_RULE: Record<Kind, string> = {
  acute: 'less than $90^\\circ$',
  right: 'exactly $90^\\circ$',
  obtuse: 'between $90^\\circ$ and $180^\\circ$',
  reflex: 'more than $180^\\circ$',
};

const geoAngleKind: Generator<KindParams> = {
  id: 'geo-angle-kind',
  sample(rng, difficulty) {
    const from = rng.pick([0, 10, 20, 30, 200, 270]);
    if (difficulty >= 2) {
      // Reflex angles, and angles either side of 90 and 180.
      const a = rng.pick([rng.int(190, 340), rng.int(81, 89), rng.int(91, 99), rng.int(170, 179), rng.int(181, 189), rng.int(190, 340)]);
      return { a, from };
    }
    const a = rng.pick([rng.int(3, 16) * 5, 90, rng.int(19, 34) * 5]);
    return { a, from };
  },
  render(p) {
    const correct = kindOf(p.a);
    const opts: ChoiceOption[] = (['acute', 'right', 'obtuse', 'reflex'] as Kind[]).map((k) => ({
      tex: word(k[0].toUpperCase() + k.slice(1)),
      correct: k === correct || undefined,
    }));
    return choiceSlide([diagram(kindSvg(p)), say('What kind of angle is this?')], opts);
  },
  solution({ a }) {
    const k = kindOf(a);
    return [
      { text: `The angle is $${a}^\\circ$, which is ${KIND_RULE[k]}.` },
      { text: `So it is ${k === 'acute' ? 'an' : 'a'} ${k === 'right' ? 'right angle' : `${k} angle`}.` },
    ];
  },
};

/* ---------- angles on a straight line ---------- */

interface LineParams {
  /** The angles along the line, left to right as drawn (anticlockwise from east). */
  sizes: number[];
  ask: number;
}

export function lineSvg({ sizes, ask }: LineParams, labels?: string[]): string {
  const v: Pt = [150, 150];
  const parts = [svgOpen(175, 'Angles on a straight line'), seg([18, 150], [282, 150])];
  let at = 0;
  for (let i = 0; i < sizes.length - 1; i += 1) {
    at += sizes[i];
    parts.push(seg(v, toward(v, at, 118)));
  }
  parts.push(fan(v, 0, sizes, ask, labels), dot(v), SVG_CLOSE);
  return parts.join('');
}

/** `count` whole angles, each at least `min`, adding to `total`. */
function split(rng: { int(a: number, b: number): number }, total: number, count: number, min: number): number[] {
  for (;;) {
    const out: number[] = [];
    let left = total;
    for (let i = 0; i < count - 1; i += 1) {
      const room = left - min * (count - 1 - i);
      const size = rng.int(min, Math.min(room, 170));
      out.push(size);
      left -= size;
    }
    if (left >= min && left <= 175) {
      out.push(left);
      if (!out.includes(90) || count > 2) return out;
    }
  }
}

const known = (sizes: number[], ask: number) => sizes.filter((_, i) => i !== ask);

const geoLineAngle: Generator<LineParams> = {
  id: 'geo-line-angle',
  sample(rng, difficulty) {
    const count = difficulty >= 2 ? 3 : 2;
    const sizes = split(rng, 180, count, difficulty >= 2 ? 28 : 25);
    return { sizes, ask: rng.int(0, count - 1) };
  },
  render(p) {
    return typed([diagram(lineSvg(p)), say('The angles sit on a straight line. Find $x$.')], p.sizes[p.ask], 'x =');
  },
  choices(p) {
    const k = known(p.sizes, p.ask);
    const s = k.reduce((a, b) => a + b, 0);
    return numberOptions(p.sizes[p.ask], [360 - s, s, 90 - k[0], 180 - k[0]], 10, 1);
  },
  solution(p) {
    const k = known(p.sizes, p.ask);
    return [
      { text: 'Angles on a straight line add up to $180^\\circ$:' },
      { tex: `x + ${k.join(' + ')} = 180` },
      { tex: `x = 180 - ${k.length > 1 ? `(${k.join(' + ')})` : k[0]} = ${p.sizes[p.ask]}` },
    ];
  },
};

/* ---------- angles round a point ---------- */

interface PointParams {
  sizes: number[];
  ask: number;
  start: number;
}

export function pointSvg({ sizes, ask, start }: PointParams, labels?: string[]): string {
  const v: Pt = [150, 115];
  const parts = [svgOpen(230, 'Angles round a point')];
  let at = start;
  for (const size of sizes) {
    parts.push(seg(v, toward(v, at, 100)));
    at += size;
  }
  parts.push(fan(v, start, sizes, ask, labels), dot(v), SVG_CLOSE);
  return parts.join('');
}

const geoPointAngle: Generator<PointParams> = {
  id: 'geo-point-angle',
  sample(rng, difficulty) {
    const count = difficulty >= 2 ? 4 : 3;
    for (;;) {
      const sizes = split(rng, 360, count, 40);
      if (sizes.some((s) => s > 175)) continue;
      return { sizes, ask: rng.int(0, count - 1), start: rng.pick([0, 15, 30, 45, 60, 75, 90]) };
    }
  },
  render(p) {
    return typed([diagram(pointSvg(p)), say('The angles are round a point. Find $x$.')], p.sizes[p.ask], 'x =');
  },
  choices(p) {
    const k = known(p.sizes, p.ask);
    const s = k.reduce((a, b) => a + b, 0);
    return numberOptions(p.sizes[p.ask], [180 - s, s, 180 - k[0], 360 - k[0]], 10, 1);
  },
  solution(p) {
    const k = known(p.sizes, p.ask);
    const s = k.reduce((a, b) => a + b, 0);
    return [
      { text: 'Angles round a point add up to $360^\\circ$. Add the ones you know:' },
      { tex: `${k.join(' + ')} = ${s}` },
      { tex: `x = 360 - ${s} = ${p.sizes[p.ask]}` },
    ];
  },
};

/* ---------- angles written with x ---------- */

interface AlgebraParams {
  /** Coefficients of x, in the order drawn. */
  coeffs: number[];
  /** A known angle, drawn after them, or 0 for none. */
  c: number;
  x: number;
  /** A straight line (180) or a full turn (360). */
  total: 180 | 360;
  start: number;
}

const xTerm = (k: number) => (k === 1 ? 'x' : `${k}x`);

const geoAngleAlgebra: Generator<AlgebraParams> = {
  id: 'geo-angle-algebra',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      for (;;) {
        const coeffs = [rng.int(1, 5), rng.int(1, 5)];
        if (coeffs[0] === coeffs[1]) continue;
        const c = rng.int(6, 16) * 10;
        const rest = 360 - c;
        const k = coeffs[0] + coeffs[1];
        if (rest % k !== 0) continue;
        const x = rest / k;
        if (coeffs.some((a) => a * x < 40 || a * x > 175) || x < 15) continue;
        if (new Set([k, rest, x]).size < 3) continue;
        return { coeffs, c, x, total: 360, start: rng.pick([0, 20, 40, 60, 90]) };
      }
    }
    for (;;) {
      const coeffs = [rng.int(1, 8), rng.int(1, 8)];
      if (coeffs[0] === coeffs[1]) continue;
      const k = coeffs[0] + coeffs[1];
      if (180 % k !== 0) continue;
      const x = 180 / k;
      if (coeffs.some((a) => a * x < 20)) continue;
      if (k === x) continue;
      return { coeffs, c: 0, x, total: 180, start: 0 };
    }
  },
  render(p) {
    const sizes = [...p.coeffs.map((a) => a * p.x), ...(p.c ? [p.c] : [])];
    const labels = [...p.coeffs.map(xTerm), ...(p.c ? [deg(p.c)] : [])];
    const k = p.coeffs[0] + p.coeffs[1];
    const sum = `${xTerm(p.coeffs[0])} + ${xTerm(p.coeffs[1])}${p.c ? ` + ${p.c}` : ''} = ${p.total}`;
    if (p.total === 180) {
      return {
        kind: 'tiles',
        prompt: [diagram(lineSvg({ sizes, ask: -1 }, labels)), say('The two angles sit on a straight line, so'), { kind: 'display', tex: sum }, say('Find $x$.')],
        template: '{0}x = 180 \\qquad x = {1}',
        bank: numberBank([k, p.x], [180 - k, 180 / Math.min(...p.coeffs), Math.min(...p.coeffs) * p.x, 90, k * 2, p.x * 2], 3, 1, 1),
        answer: [num(k), num(p.x)],
      };
    }
    return {
      kind: 'tiles',
      prompt: [diagram(pointSvg({ sizes, ask: -1, start: p.start }, labels)), say('The angles are round a point, so'), { kind: 'display', tex: sum }, say('Find $x$.')],
      template: '{0}x = {1} \\quad x = {2}',
      bank: numberBank([k, 360 - p.c, p.x], [360 + p.c, 180 - p.c, k + 1, p.coeffs[0] * p.coeffs[1], (180 - p.c) / k], 3, 1, 1),
      answer: [num(k), num(360 - p.c), num(p.x)],
    };
  },
  solution(p) {
    const [a, b] = p.coeffs;
    const k = a + b;
    if (p.total === 180) {
      return [
        { text: 'The angles are on a straight line, so they add up to $180^\\circ$:' },
        { tex: `${xTerm(a)} + ${xTerm(b)} = 180` },
        { tex: `${k}x = 180` },
        { tex: `x = 180 \\div ${k} = ${p.x}` },
        { text: 'Check: the two angles are' },
        { tex: `${a * p.x} + ${b * p.x} = 180` },
      ];
    }
    return [
      { text: 'Angles round a point add up to $360^\\circ$:' },
      { tex: `${xTerm(a)} + ${xTerm(b)} + ${p.c} = 360` },
      { tex: `${k}x = 360 - ${p.c} = ${360 - p.c}` },
      { tex: `x = ${360 - p.c} \\div ${k} = ${p.x}` },
    ];
  },
};

/* ================================================================
 * Lesson 2: Parallel Lines
 * ================================================================ */

/* ---------- two crossing lines ---------- */

interface CrossParams {
  /** The sector sizes going round, starting at `start`: [s, 180 - s, s, 180 - s] or six for three lines. */
  sizes: number[];
  given: number[];
  ask: number;
  start: number;
}

export function crossSvg({ sizes, given, ask, start }: CrossParams): string {
  const v: Pt = [150, 112];
  const parts = [svgOpen(224, sizes.length === 4 ? 'Two straight lines crossing' : 'Three straight lines crossing at a point')];
  let at = start;
  for (let i = 0; i < sizes.length / 2; i += 1) {
    parts.push(seg(toward(v, at, 110), toward(v, at + 180, 110)));
    at += sizes[i];
  }
  at = start;
  sizes.forEach((size, i) => {
    if (i === ask) parts.push(angle(v, at, size, 'x', { unknown: true }));
    else if (given.includes(i)) parts.push(angle(v, at, size, deg(size)));
    at += size;
  });
  parts.push(dot(v), SVG_CLOSE);
  return parts.join('');
}

const geoCrossAngle: Generator<CrossParams> = {
  id: 'geo-cross-angle',
  sample(rng, difficulty) {
    const start = rng.pick([0, 10, 20, 30, 40]);
    if (difficulty >= 2) {
      for (;;) {
        const [a, b, c] = split(rng, 180, 3, 32);
        const sizes = [a, b, c, a, b, c];
        const g = rng.int(0, 5);
        // Two neighbours given; x opposite the third, or beside them on the line.
        const given = [g, (g + 1) % 6];
        const ask = rng.pick([(g + 2) % 6, (g + 5) % 6]);
        return { sizes, given, ask, start };
      }
    }
    for (;;) {
      const s = rng.int(25, 155);
      if (Math.abs(s - 90) < 12) continue;
      const g = rng.int(0, 3);
      const ask = rng.pick([(g + 1) % 4, (g + 2) % 4, (g + 3) % 4]);
      return { sizes: [s, 180 - s, s, 180 - s], given: [g], ask, start };
    }
  },
  render(p) {
    return typed([diagram(crossSvg(p)), say(p.sizes.length === 4 ? 'Two straight lines cross. Find $x$.' : 'Three straight lines cross at one point. Find $x$.')], p.sizes[p.ask], 'x =');
  },
  choices(p) {
    const x = p.sizes[p.ask];
    const g = p.given.map((i) => p.sizes[i]);
    return numberOptions(x, [180 - x, g[0], 360 - x, 90 - (x % 90), g[0] + (g[1] ?? 0)], 5, 1);
  },
  solution(p) {
    const x = p.sizes[p.ask];
    if (p.sizes.length === 4) {
      const g = p.sizes[p.given[0]];
      if ((p.ask - p.given[0] + 4) % 2 === 0) {
        return [{ text: '$x$ is opposite the marked angle. Vertically opposite angles are equal:' }, { tex: `x = ${g}` }];
      }
      return [{ text: '$x$ and the marked angle sit side by side on a straight line, so they add up to $180^\\circ$:' }, { tex: `x = 180 - ${g} = ${x}` }];
    }
    const [a, b] = p.given.map((i) => p.sizes[i]);
    return [
      { text: 'The two marked angles and $x$ sit side by side along one straight line, so the three add up to $180^\\circ$:' },
      { tex: `x = 180 - ${a} - ${b} = ${x}` },
    ];
  },
};

/* ---------- a transversal crossing two parallel lines ---------- */

type Relation = 'corresponding' | 'alternate' | 'co-interior' | 'vertically opposite';

/** Angle i at the top crossing (0-3) or bottom (4-7), counted anticlockwise from east. */
interface Transversal {
  /** The angle the transversal makes with the parallel lines, anticlockwise from east. */
  phi: number;
}

const GAP = 110;

/** The two crossings, placed so the pair sits in the middle of the figure. */
function crossings({ phi }: Transversal): [Pt, Pt] {
  const run = GAP / Math.tan((phi * Math.PI) / 180);
  const top: Pt = [150 + run / 2, 62];
  const bottom = toward(top, 180 + phi, GAP / Math.sin((phi * Math.PI) / 180));
  return [top, bottom];
}

/** Size of angle i (0-7): 0 and 2 are phi, 1 and 3 are 180 - phi, at each crossing. */
const sectorSize = (phi: number, i: number) => (i % 2 === 0 ? phi : 180 - phi);
const sectorStart = (phi: number, i: number) => [0, phi, 180, 180 + phi][i % 4];

function relationOf(i: number, j: number): Relation | undefined {
  const [a, b] = [Math.min(i, j), Math.max(i, j)];
  if (a < 4 && b >= 4) {
    if (a === b - 4) return 'corresponding';
    if ((a === 2 && b === 4) || (a === 3 && b === 5)) return 'alternate';
    if ((a === 2 && b === 5) || (a === 3 && b === 4)) return 'co-interior';
    return undefined;
  }
  if (Math.abs(a - b) === 2) return 'vertically opposite';
  return undefined;
}

export function parallelSvg(t: Transversal, marks: { i: number; label: string; unknown?: boolean }[]): string {
  const [P, Q] = crossings(t);
  const lineY = [P[1], Q[1]];
  const parts = [svgOpen(236, 'Two parallel lines crossed by a third line')];
  for (const y of lineY) {
    parts.push(seg([14, y], [286, y]), parallelArrows([14, y], [286, y], 1, 0.12));
  }
  parts.push(seg(toward(P, t.phi, 48), toward(Q, 180 + t.phi, 48)));
  for (const m of marks) {
    const v = m.i < 4 ? P : Q;
    parts.push(angle(v, sectorStart(t.phi, m.i), sectorSize(t.phi, m.i), m.label, { unknown: m.unknown, r: 18 }));
  }
  parts.push(SVG_CLOSE);
  return parts.join('');
}

const PAIRS: Record<Relation, [number, number][]> = {
  corresponding: [
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ],
  alternate: [
    [2, 4],
    [3, 5],
  ],
  'co-interior': [
    [2, 5],
    [3, 4],
  ],
  'vertically opposite': [
    [0, 2],
    [1, 3],
    [4, 6],
    [5, 7],
  ],
};

const SHAPE: Record<Relation, string> = {
  corresponding: 'an F shape',
  alternate: 'a Z shape',
  'co-interior': 'a C shape',
  'vertically opposite': 'an X shape',
};

interface NameParams {
  phi: number;
  pair: [number, number];
}

const geoParallelName: Generator<NameParams> = {
  id: 'geo-parallel-name',
  sample(rng, difficulty) {
    const phi = difficulty >= 2 ? rng.int(106, 130) : rng.int(50, 74);
    const rel = rng.pick(Object.keys(PAIRS) as Relation[]);
    const pair = rng.pick(PAIRS[rel]);
    return { phi, pair: rng.chance(0.5) ? pair : [pair[1], pair[0]] };
  },
  render({ phi, pair }) {
    const rel = relationOf(pair[0], pair[1])!;
    const opts: ChoiceOption[] = (Object.keys(PAIRS) as Relation[]).map((r) => ({
      tex: word(r[0].toUpperCase() + r.slice(1)),
      correct: r === rel || undefined,
    }));
    return choiceSlide(
      [
        diagram(parallelSvg({ phi }, [
          { i: pair[0], label: 'p' },
          { i: pair[1], label: 'q' },
        ])),
        say('The arrows mark two parallel lines. What kind of pair are the angles $p$ and $q$?'),
      ],
      opts,
    );
  },
  solution({ pair }) {
    const rel = relationOf(pair[0], pair[1])!;
    const where = pair[0] < 4 === pair[1] < 4 ? 'at the same crossing' : 'one at each crossing';
    const tail: Record<Relation, string> = {
      corresponding: 'They sit in the same position at each crossing, so they are corresponding, and equal.',
      alternate: 'They are both between the parallel lines, on opposite sides of the crossing line, so they are alternate, and equal.',
      'co-interior': 'They are both between the parallel lines, on the same side of the crossing line, so they are co-interior, and add up to $180^\\circ$.',
      'vertically opposite': 'They are opposite each other where two lines cross, so they are vertically opposite, and equal.',
    };
    return [{ text: `$p$ and $q$ are ${where}, making ${SHAPE[rel]}.` }, { text: tail[rel] }];
  },
};

interface FindParams {
  phi: number;
  given: number;
  ask: number;
}

const geoParallelFind: Generator<FindParams> = {
  id: 'geo-parallel-find',
  sample(rng, difficulty) {
    for (;;) {
      const phi = rng.pick([rng.int(40, 78), rng.int(102, 140)]);
      if (difficulty >= 2) {
        // Any angle at one crossing and any at the other: sometimes two steps.
        const given = rng.int(0, 3);
        const ask = rng.int(4, 7);
        if (relationOf(given, ask) !== undefined) continue;
        return rng.chance(0.5) ? { phi, given, ask } : { phi, given: ask, ask: given };
      }
      const rel = rng.pick(['corresponding', 'alternate', 'co-interior'] as Relation[]);
      const [a, b] = rng.pick(PAIRS[rel]);
      return rng.chance(0.5) ? { phi, given: a, ask: b } : { phi, given: b, ask: a };
    }
  },
  render(p) {
    const g = sectorSize(p.phi, p.given);
    return typed(
      [
        diagram(parallelSvg({ phi: p.phi }, [
          { i: p.given, label: deg(g) },
          { i: p.ask, label: 'x', unknown: true },
        ])),
        say('The arrows mark two parallel lines. Find $x$.'),
      ],
      sectorSize(p.phi, p.ask),
      'x =',
    );
  },
  choices(p) {
    const x = sectorSize(p.phi, p.ask);
    return numberOptions(x, [180 - x, 360 - x, 90 - (x % 90), x / 2], 5, 1);
  },
  solution(p) {
    const g = sectorSize(p.phi, p.given);
    const x = sectorSize(p.phi, p.ask);
    const rel = relationOf(p.given, p.ask);
    if (rel === 'corresponding' || rel === 'alternate') {
      return [{ text: `The two angles make ${SHAPE[rel]}: they are ${rel} angles, so they are equal.` }, { tex: `x = ${g}` }];
    }
    if (rel === 'co-interior') {
      return [{ text: 'The two angles make a C shape: they are co-interior, so they add up to $180^\\circ$.' }, { tex: `x = 180 - ${g} = ${x}` }];
    }
    // Two steps: across the straight line at the given crossing, then corresponding.
    const step = p.given < 4 ? p.ask - 4 : p.ask + 4;
    const mid = sectorSize(p.phi, step);
    const steps: SolutionStep[] = [{ text: 'Work across in two steps. First, the angle at the given crossing that sits in the same position as $x$:' }];
    if (mid === g) steps.push({ text: 'It is vertically opposite the marked angle, so it is equal to it:' }, { tex: `${g}` });
    else steps.push({ text: 'It sits beside the marked angle on a straight line:' }, { tex: `180 - ${g} = ${mid}` });
    steps.push({ text: 'That angle and $x$ are corresponding, so they are equal:' }, { tex: `x = ${x}` });
    return steps;
  },
};

/* ---------- a triangle between parallel lines ---------- */

interface BetweenParams {
  /** The angles at P outside the triangle, left and right. */
  a: number;
  b: number;
}

function betweenPoints({ a, b }: BetweenParams) {
  const P: Pt = [0, 0];
  const h = 100;
  const A = toward(P, 180 + a, h / Math.sin((a * Math.PI) / 180));
  const B = toward(P, 360 - b, h / Math.sin((b * Math.PI) / 180));
  const left = Math.min(A[0], P[0]) - 34;
  const right = Math.max(B[0], P[0]) + 34;
  const pts = fit([P, A, B, [left, 0], [right, 0], [left, h], [right, h]], 250, 130, 25, 32);
  return { P: pts[0], A: pts[1], B: pts[2], tl: pts[3], tr: pts[4], bl: pts[5], br: pts[6] };
}

export function betweenSvg(p: BetweenParams): string {
  const { P, A, B, tl, tr, bl, br } = betweenPoints(p);
  return [
    svgOpen(196, 'A triangle with one corner on the top line and two on the bottom line, the lines parallel'),
    seg(tl, tr),
    seg(bl, br),
    parallelArrows(tl, tr, 1, 0.08),
    parallelArrows(bl, br, 1, 0.08),
    outline([P, A, B]),
    angle(P, 180, p.a, deg(p.a), { r: 18 }),
    angle(P, 360 - p.b, p.b, deg(p.b), { r: 18 }),
    text([P[0], P[1] - 13], 'P'),
    text([A[0] - 6, A[1] + 14], 'A'),
    text([B[0] + 6, B[1] + 14], 'B'),
    SVG_CLOSE,
  ].join('');
}

const geoParallelTriangle: Generator<BetweenParams> = {
  id: 'geo-parallel-triangle',
  sample(rng, difficulty) {
    for (;;) {
      const lo = difficulty >= 2 ? 30 : 40;
      const a = rng.int(lo, 78);
      const b = rng.int(lo, 78);
      const c = 180 - a - b;
      if (a === b || c === a || c === b || c < 25) continue;
      return { a, b };
    }
  },
  render(p): Slide {
    const c = 180 - p.a - p.b;
    return {
      kind: 'table',
      prompt: [diagram(betweenSvg(p)), say('The arrows mark two parallel lines. Fill in the angles of triangle $PAB$.')],
      columns: ['\\text{Angle}', '\\text{Size}'],
      rows: [
        ['\\angle PAB', null],
        ['\\angle PBA', null],
        ['\\angle APB', null],
      ],
      bank: numberBank([p.a, p.b, c], [180 - p.a, 180 - p.b, p.a + p.b, 90 - p.a], 3, 1, 1),
      answer: [p.a, p.b, c].map(num),
    };
  },
  solution(p) {
    const c = 180 - p.a - p.b;
    return [
      { text: `$\\angle PAB$ and the $${p.a}^\\circ$ at $P$ make a Z shape: alternate angles, so they are equal.` },
      { tex: `\\angle PAB = ${p.a}` },
      { text: `The same on the right:` },
      { tex: `\\angle PBA = ${p.b}` },
      { text: 'The three angles at $P$ make a straight line:' },
      { tex: `\\angle APB = 180 - ${p.a} - ${p.b} = ${c}` },
    ];
  },
};

/* ================================================================
 * Lesson 3: Triangle Sides and Angles
 * ================================================================ */

/** A triangle with base angles A, B, drawn to fit, with a label at each corner. */
export function triangleSvg(A: number, B: number, labels: string[], opts: { unknown?: number; square?: number; ticks?: [number, number][]; extend?: boolean; extLabel?: string } = {}): string {
  const raw = triangleFromAngles(A, B);
  const extra: Pt[] = opts.extend ? [[1.55, 0]] : [];
  const pts = fit([...raw, ...extra], opts.extend ? 250 : 230, 140, opts.extend ? 20 : 35, 22);
  const [pa, pb, pc] = pts;
  const parts = [svgOpen(186, 'A triangle'), outline([pa, pb, pc])];
  if (opts.extend) parts.push(seg(pb, pts[3], DASHED));
  const corners: [Pt, Pt, Pt][] = [
    [pb, pa, pc],
    [pa, pb, pc],
    [pa, pc, pb],
  ];
  corners.forEach(([u, v, w], i) => {
    if (!labels[i] && opts.square !== i) return;
    parts.push(cornerAngle(u, v, w, labels[i], { unknown: opts.unknown === i, square: opts.square === i }));
  });
  if (opts.extend && opts.extLabel) {
    parts.push(angle(pb, 0, 180 - B, opts.extLabel, { unknown: opts.extLabel === 'x' }));
  }
  for (const [i, j] of opts.ticks ?? []) parts.push(ticks(pts[i], pts[j], 1));
  parts.push(SVG_CLOSE);
  return parts.join('');
}

/* ---------- the third angle ---------- */

interface TriParams {
  angles: [number, number, number];
  ask: number;
}

const geoTriangleAngle: Generator<TriParams> = {
  id: 'geo-triangle-angle',
  sample(rng, difficulty) {
    for (;;) {
      let angles: [number, number, number];
      if (difficulty >= 2 && rng.chance(0.5)) {
        const a = rng.int(20, 70);
        angles = rng.pick([
          [90, a, 90 - a],
          [a, 90, 90 - a],
        ]) as [number, number, number];
      } else {
        const a = rng.int(difficulty >= 2 ? 95 : 30, difficulty >= 2 ? 130 : 95);
        const b = rng.int(22, 180 - a - 22);
        angles = rng.pick([
          [a, b, 180 - a - b],
          [b, a, 180 - a - b],
          [b, 180 - a - b, a],
        ]) as [number, number, number];
      }
      if (angles.some((v) => v < 20)) continue;
      const ask = rng.int(0, 2);
      if (angles[ask] === 90) continue;
      return { angles, ask };
    }
  },
  render({ angles, ask }) {
    const labels = angles.map((v, i) => (i === ask ? 'x' : v === 90 ? '' : deg(v)));
    const right = angles.indexOf(90);
    return typed(
      [
        diagram(triangleSvg(angles[0], angles[1], labels, { unknown: ask, square: right >= 0 ? right : undefined })),
        say('Find $x$.'),
      ],
      angles[ask],
      'x =',
    );
  },
  choices({ angles, ask }) {
    const k = angles.filter((_, i) => i !== ask);
    const s = k[0] + k[1];
    return numberOptions(angles[ask], [360 - s, s, 90 - k[0], 180 - k[0]], 5, 1);
  },
  solution({ angles, ask }) {
    const k = angles.filter((_, i) => i !== ask);
    const steps: SolutionStep[] = [];
    if (k.includes(90)) steps.push({ text: 'The square marks a right angle, $90^\\circ$.' });
    steps.push({ text: 'The angles in a triangle add up to $180^\\circ$:' }, { tex: `x = 180 - ${k[0]} - ${k[1]} = ${angles[ask]}` });
    return steps;
  },
};

/* ---------- isosceles triangles ---------- */

interface IsoParams {
  /** The angle between the equal sides. */
  apex: number;
  /** Given the apex (find a base angle), or given a base angle (find the apex). */
  given: 'apex' | 'base';
}

const geoIsosceles: Generator<IsoParams> = {
  id: 'geo-isosceles',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      // Given a base angle: the apex is 180 - 2b.
      const base = rng.int(24, 80);
      return { apex: 180 - 2 * base, given: 'base' };
    }
    return { apex: 2 * rng.int(12, 64), given: 'apex' };
  },
  render({ apex, given }) {
    const base = (180 - apex) / 2;
    const labels = given === 'apex' ? ['x', '', deg(apex)] : ['', deg(base), 'x'];
    return typed(
      [
        diagram(triangleSvg(base, base, labels, { unknown: given === 'apex' ? 0 : 2, ticks: [[0, 2], [1, 2]] })),
        say('The marks show two equal sides. Find $x$.'),
      ],
      given === 'apex' ? base : apex,
      'x =',
    );
  },
  choices({ apex, given }) {
    const base = (180 - apex) / 2;
    if (given === 'apex') return numberOptions(base, [apex, 180 - apex, 180 - 2 * apex, 90 - apex], 2, 1);
    return numberOptions(apex, [base, 180 - base, (180 - base) / 2, 90 - base], 2, 1);
  },
  solution({ apex, given }) {
    const base = (180 - apex) / 2;
    if (given === 'apex') {
      return [
        { text: 'Two equal sides make the two base angles equal. They share what the top angle leaves:' },
        { tex: `180 - ${apex} = ${180 - apex}` },
        { tex: `x = ${180 - apex} \\div 2 = ${base}` },
      ];
    }
    return [
      { text: `Two equal sides make the two base angles equal, so both are $${base}^\\circ$.` },
      { tex: `x = 180 - ${base} - ${base} = ${apex}` },
    ];
  },
};

/* ---------- the exterior angle ---------- */

interface ExtParams {
  /** Interior angles at A (left), B (right, the extended corner) and C (top). */
  A: number;
  B: number;
  /** Find the exterior angle, or find the angle at C from it. */
  ask: 'exterior' | 'C';
}

const geoExteriorAngle: Generator<ExtParams> = {
  id: 'geo-exterior-angle',
  sample(rng, difficulty) {
    for (;;) {
      const A = rng.int(30, 75);
      const B = rng.int(35, 100);
      const C = 180 - A - B;
      if (C < 25 || C === A) continue;
      return { A, B, ask: difficulty >= 2 ? 'C' : 'exterior' };
    }
  },
  render({ A, B, ask }) {
    const C = 180 - A - B;
    const ext = 180 - B;
    const svg =
      ask === 'exterior'
        ? triangleSvg(A, B, [deg(A), '', deg(C)], { extend: true, extLabel: 'x' })
        : triangleSvg(A, B, [deg(A), '', 'x'], { extend: true, extLabel: deg(ext), unknown: 2 });
    return typed(
      [diagram(svg), say('One side of the triangle is extended. Find $x$.')],
      ask === 'exterior' ? ext : C,
      'x =',
    );
  },
  choices({ A, B, ask }) {
    const C = 180 - A - B;
    if (ask === 'exterior') return numberOptions(A + C, [180 - A - C, 180 - A, 180 - C, B], 5, 1);
    return numberOptions(C, [180 - B + A, B, 180 - A, 180 - (180 - B)], 5, 1);
  },
  solution({ A, B, ask }) {
    const C = 180 - A - B;
    if (ask === 'exterior') {
      return [
        { text: 'An exterior angle of a triangle equals the two inside angles opposite it added together:' },
        { tex: `x = ${A} + ${C} = ${A + C}` },
      ];
    }
    return [
      { text: 'The exterior angle equals the two inside angles opposite it added together:' },
      { tex: `${A} + x = ${180 - B}` },
      { tex: `x = ${180 - B} - ${A} = ${C}` },
    ];
  },
};

/* ---------- triangle angles written with x ---------- */

interface TriAlgebraParams {
  coeffs: [number, number, number];
  /** A known angle in place of the third term, or 0. */
  c: number;
  x: number;
}

const geoTriangleAlgebra: Generator<TriAlgebraParams> = {
  id: 'geo-triangle-algebra',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const coeffs: [number, number, number] = [rng.int(1, 5), rng.int(1, 5), 0];
        if (coeffs[0] === coeffs[1]) continue;
        const c = rng.int(3, 11) * 10;
        const k = coeffs[0] + coeffs[1];
        if ((180 - c) % k !== 0) continue;
        const x = (180 - c) / k;
        if (x < 10 || coeffs.slice(0, 2).some((a) => a * x < 20)) continue;
        if (new Set([k, 180 - c, x]).size < 3) continue;
        return { coeffs, c, x };
      }
      const coeffs: [number, number, number] = [rng.int(1, 6), rng.int(1, 6), rng.int(1, 6)];
      const k = coeffs[0] + coeffs[1] + coeffs[2];
      if (180 % k !== 0 || new Set(coeffs).size < 2) continue;
      const x = 180 / k;
      if (coeffs.some((a) => a * x < 20 || a * x >= 150)) continue;
      if (k === x) continue;
      return { coeffs, c: 0, x };
    }
  },
  render({ coeffs, c, x }) {
    const sizes = [coeffs[0] * x, coeffs[1] * x, c || coeffs[2] * x];
    const labels = [xTerm(coeffs[0]), xTerm(coeffs[1]), c ? deg(c) : xTerm(coeffs[2])];
    const svg = triangleSvg(sizes[0], sizes[1], labels);
    // The figure's "30°" is plain text; in TeX the equation is in plain numbers, like every other line of working.
    const sum = `${[xTerm(coeffs[0]), xTerm(coeffs[1]), c ? String(c) : xTerm(coeffs[2])].join(' + ')} = 180`;
    const prompt = [diagram(svg), say('The angles of a triangle add up to $180^\\circ$:'), { kind: 'display' as const, tex: sum }, say('Find $x$.')];
    if (c) {
      const k = coeffs[0] + coeffs[1];
      return {
        kind: 'tiles',
        prompt,
        template: '{0}x = {1} \\quad x = {2}',
        bank: numberBank([k, 180 - c, x], [180 + c, 360 - c, k + 1, (360 - c) / k], 3, 1, 1),
        answer: [num(k), num(180 - c), num(x)],
      };
    }
    const k = coeffs[0] + coeffs[1] + coeffs[2];
    return {
      kind: 'tiles',
      prompt,
      template: '{0}x = 180 \\qquad x = {1}',
      bank: numberBank([k, x], [360 / k, Math.min(...coeffs) * x, k + 1, 2 * x, 180 - Math.max(...coeffs) * x], 3, 1, 1),
      answer: [num(k), num(x)],
    };
  },
  solution({ coeffs, c, x }) {
    if (c) {
      const k = coeffs[0] + coeffs[1];
      return [
        { text: 'The angles in a triangle add up to $180^\\circ$:' },
        { tex: `${xTerm(coeffs[0])} + ${xTerm(coeffs[1])} + ${c} = 180` },
        { tex: `${k}x = ${180 - c}` },
        { tex: `x = ${180 - c} \\div ${k} = ${x}` },
      ];
    }
    const k = coeffs[0] + coeffs[1] + coeffs[2];
    const m = Math.max(...coeffs);
    return [
      { text: 'The angles in a triangle add up to $180^\\circ$. Collect the $x$ terms:' },
      { tex: `${coeffs.map(xTerm).join(' + ')} = ${k}x = 180` },
      { tex: `x = 180 \\div ${k} = ${x}` },
      { text: 'The largest angle:' },
      { tex: `${m} \\times ${x} = ${m * x}` },
    ];
  },
};

export const geometryAnglesGenerators = [
  geoAngleKind,
  geoLineAngle,
  geoPointAngle,
  geoAngleAlgebra,
  geoCrossAngle,
  geoParallelName,
  geoParallelFind,
  geoParallelTriangle,
  geoTriangleAngle,
  geoIsosceles,
  geoExteriorAngle,
  geoTriangleAlgebra,
];
