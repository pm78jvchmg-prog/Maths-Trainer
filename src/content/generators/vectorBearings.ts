/**
 * Journeys and bearings (Vectors, level 15, `vm-l15`).
 *
 * Three-figure bearings, turning a distance on a bearing into east and north
 * components and back again, journeys of several legs, and a velocity plus a
 * current or a wind.
 *
 * Every answer is exact. Components come from bearings whose angle to the
 * north-south line is 30, 45 or 60 degrees, so they are whole numbers or
 * surds; distances and speeds come from Pythagorean triples, so they are
 * whole; and a bearing asked for is a whole number of degrees. The one place
 * a rounded angle appears (`vjour-quadrant-flow`) states it in the question,
 * and the flow grades the route rather than a typed number, so no answer here
 * leans on a rounding tolerance.
 *
 * Throughout, a vector written as a column is (east, north), and i is east
 * and j is north.
 */
import type { Generator, KeypadKey, Slide, SolutionStep } from '../types';
import { options } from '../choiceVariant';
import { gcd } from './format';
import { bankOf, columnTex, signedChoices, VECTOR_TEMPLATE } from './vectorFormat';

type Draw = Parameters<Generator['sample']>[0];
type Vec = [number, number];

/* ---------- shared helpers ---------- */

const mod360 = (b: number) => ((b % 360) + 360) % 360;

/** Three figures: 45 is `045`. */
const pad = (b: number) => (b < 0 ? `${b}` : String(b).padStart(3, '0'));

/** A bearing as the learner reads it: `045^\circ`. */
const brg = (b: number) => `${pad(b)}^\\circ`;

/** A bank or option list of bearings, smallest first. */
const byValue = (values: number[]) => [...values].sort((p, q) => p - q);

const paren = (n: number) => (n < 0 ? `(${n})` : `${n}`);

const SURD_KEYS: KeypadKey[] = [{ insert: 'sqrt(', label: '√(' }, { insert: '*', label: '×' }];

/** A number of the form c times the square root of r, with r 1, 2 or 3. */
interface Surd {
  c: number;
  r: number;
}

function surdTex({ c, r }: Surd): string {
  if (r === 1 || c === 0) return `${c}`;
  if (c === 1) return `\\sqrt{${r}}`;
  if (c === -1) return `-\\sqrt{${r}}`;
  return `${c}\\sqrt{${r}}`;
}

const surdMath = ({ c, r }: Surd) => (r === 1 ? `${c}` : `${c}*sqrt(${r})`);
const surdValue = ({ c, r }: Surd) => c * Math.sqrt(r);
const surdAbs = ({ c, r }: Surd): Surd => ({ c: Math.abs(c), r });
const surdNeg = ({ c, r }: Surd): Surd => ({ c: -c, r });

/** A length in km, for prose: `5\sqrt{3}` or `4`. */
const kmTex = (s: Surd) => `${surdTex(surdAbs(s))}`;

type Acute = 30 | 45 | 60;
const ACUTES: Acute[] = [30, 45, 60];

/**
 * sin and cos of the special angles, each as a multiple of one half:
 * sin 30 = (1/2) root 1, cos 30 = (1/2) root 3, and so on. A distance d = 2k
 * then has components k root r.
 */
const SIN_ROOT: Record<Acute, number> = { 30: 1, 45: 2, 60: 3 };
const COS_ROOT: Record<Acute, number> = { 30: 3, 45: 2, 60: 1 };
const SIN_TEX: Record<Acute, string> = { 30: '\\frac{1}{2}', 45: '\\frac{\\sqrt{2}}{2}', 60: '\\frac{\\sqrt{3}}{2}' };
const COS_TEX: Record<Acute, string> = { 30: '\\frac{\\sqrt{3}}{2}', 45: '\\frac{\\sqrt{2}}{2}', 60: '\\frac{1}{2}' };
const TAN_TEX: Record<Acute, string> = { 30: '\\frac{1}{\\sqrt{3}}', 45: '1', 60: '\\sqrt{3}' };

/** Quadrants, clockwise from north-east: 0 NE, 1 SE, 2 SW, 3 NW. */
type Quad = 0 | 1 | 2 | 3;
const QUADS: Quad[] = [0, 1, 2, 3];
const EAST_SIGN = [1, 1, -1, -1];
const NORTH_SIGN = [1, -1, -1, 1];

/** The bearing from the acute angle to the north-south line, by quadrant. */
const bearingFrom = (alpha: number, q: Quad) => [alpha, 180 - alpha, 180 + alpha, 360 - alpha][q];

/** The rule for each quadrant, as the teaching writes it. */
const RULE_TEX = ['\\alpha', '180^\\circ - \\alpha', '180^\\circ + \\alpha', '360^\\circ - \\alpha'];

function quadOf(e: number, n: number): Quad {
  if (e > 0) return n > 0 ? 0 : 1;
  return n < 0 ? 2 : 3;
}

const ew = (e: number) => (e < 0 ? 'west' : 'east');
const ns = (n: number) => (n < 0 ? 'south' : 'north');

/** Who travels. Kept to things that go by the kilometre. */
const WHO = ['a ship', 'a yacht', 'a hiker', 'a drone', 'a plane', 'a ferry'];
const Who = (i: number) => WHO[i][0].toUpperCase() + WHO[i].slice(1);
const whoName = (i: number) => WHO[i].slice(2);

/** Components of a distance 2k on bearing from angle alpha, quadrant q. */
function componentsOf(alpha: Acute, q: Quad, k: number): { east: Surd; north: Surd } {
  return {
    east: { c: EAST_SIGN[q] * k, r: SIN_ROOT[alpha] },
    north: { c: NORTH_SIGN[q] * k, r: COS_ROOT[alpha] },
  };
}

/** `\frac{a}{b}` in lowest terms, or whole. */
function fracTex(n: number, d: number): string {
  const g = gcd(Math.abs(n), Math.abs(d)) || 1;
  const [p, q] = [n / g, d / g];
  return q === 1 ? `${p}` : `\\frac{${p}}{${q}}`;
}

/** Pythagorean triples, legs first. */
const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [9, 40, 41],
];

/** A scaled triple with hypotenuse at most `longest`, legs in either order. */
function triple(rng: Draw, longest: number): [number, number, number] {
  const rows: [number, number, number][] = [];
  for (const [a, b, c] of TRIPLES) {
    for (let k = 1; c * k <= longest; k += 1) rows.push([a * k, b * k, c * k]);
  }
  const [a, b, c] = rng.pick(rows);
  return rng.chance(0.5) ? [a, b, c] : [b, a, c];
}

/* ---------- figures ---------- */

const rad = (deg: number) => (deg * Math.PI) / 180;
const f1 = (n: number) => n.toFixed(1);

/** The point `r` pixels from (cx, cy) on bearing `b`. */
function toward(cx: number, cy: number, r: number, b: number): [number, number] {
  return [cx + r * Math.sin(rad(b)), cy - r * Math.cos(rad(b))];
}

function label(x: number, y: number, text: string, size = 12, weight = 400): string {
  return `<text x="${f1(x)}" y="${f1(y)}" font-size="${size}" font-weight="${weight}" text-anchor="middle" dominant-baseline="middle" fill="currentColor">${text}</text>`;
}

/** A north line up from a point, with an arrowhead and an N. */
function northLine(x: number, y: number, len: number, dashed = false): string {
  const top = y - len;
  return [
    `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x)}" y2="${f1(top)}" stroke="currentColor" stroke-width="1.5"${dashed ? ' stroke-dasharray="4 3"' : ''} opacity="0.7" />`,
    `<path d="M ${f1(x - 4)} ${f1(top + 7)} L ${f1(x)} ${f1(top)} L ${f1(x + 4)} ${f1(top + 7)}" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.7" />`,
    label(x, top - 9, 'N', 12, 600),
  ].join('');
}

/** A line with an arrowhead at its far end, on bearing `b` from (x, y). */
function leg(x: number, y: number, b: number, len: number): string {
  const [ex, ey] = toward(x, y, len, b);
  const [h1x, h1y] = toward(ex, ey, 10, b + 180 - 25);
  const [h2x, h2y] = toward(ex, ey, 10, b + 180 + 25);
  return [
    `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(ex)}" y2="${f1(ey)}" class="plot-accent" stroke="currentColor" stroke-width="2.5" />`,
    `<path d="M ${f1(h1x)} ${f1(h1y)} L ${f1(ex)} ${f1(ey)} L ${f1(h2x)} ${f1(h2y)}" fill="none" class="plot-accent" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />`,
  ].join('');
}

/** An arc turning clockwise from bearing `from` to bearing `to`, labelled at its middle. */
function arc(cx: number, cy: number, r: number, from: number, to: number, text: string): string {
  const sweep = mod360(to - from);
  const [x1, y1] = toward(cx, cy, r, from);
  const [x2, y2] = toward(cx, cy, r, to);
  const [lx, ly] = toward(cx, cy, r + 17, from + sweep / 2);
  return [
    `<path d="M ${f1(x1)} ${f1(y1)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${f1(x2)} ${f1(y2)}" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.8" />`,
    label(lx, ly, text, 12),
  ].join('');
}

/**
 * The drawing wrapped in an svg whose viewBox hugs what was drawn, so a leg
 * pointing north-east does not leave an empty square below it. Every
 * coordinate the parts wrote is read back, with a margin for label text.
 */
function fitted(aria: string, parts: string[]): string {
  const inner = parts.join('');
  const xs: number[] = [];
  const ys: number[] = [];
  for (const m of inner.matchAll(/\b(x|x1|x2|y|y1|y2)="(-?[\d.]+)"/g)) (m[1][0] === 'x' ? xs : ys).push(Number(m[2]));
  for (const m of inner.matchAll(/[ML] (-?[\d.]+) (-?[\d.]+)/g)) {
    xs.push(Number(m[1]));
    ys.push(Number(m[2]));
  }
  for (const m of inner.matchAll(/ 1 (-?[\d.]+) (-?[\d.]+)" fill/g)) {
    xs.push(Number(m[1]));
    ys.push(Number(m[2]));
  }
  const margin = 16;
  const x0 = Math.min(...xs) - margin;
  const y0 = Math.min(...ys) - margin;
  const w = Math.max(...xs) + margin - x0;
  const h = Math.max(...ys) + margin - y0;
  return `<svg viewBox="${f1(x0)} ${f1(y0)} ${f1(w)} ${f1(h)}" width="100%" style="max-width:${Math.round(w * 1.3)}px" role="img" aria-label="${aria}">${inner}</svg>`;
}

const COMPASS = ['north', 'east', 'south', 'west'];

/**
 * B on a bearing from A, the angle drawn from one of the four compass lines.
 * `ref` is the compass line (0 north, 1 east, 2 south, 3 west) and `side` is
 * which way the angle turns from it, +1 clockwise.
 */
export function readSvg(ref: number, side: number, a: number): string {
  const cx = 120;
  const cy = 125;
  const b = mod360(ref * 90 + side * a);
  const parts: string[] = [];
  parts.push(northLine(cx, cy, 100));
  if (ref !== 0) {
    const [rx, ry] = toward(cx, cy, 88, ref * 90);
    parts.push(
      `<line x1="${cx}" y1="${cy}" x2="${f1(rx)}" y2="${f1(ry)}" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.7" />`,
    );
    const [tx, ty] = toward(cx, cy, 100, ref * 90);
    parts.push(label(tx, ty, COMPASS[ref][0].toUpperCase(), 12, 600));
  }
  parts.push(leg(cx, cy, b, 90));
  const [bx, by] = toward(cx, cy, 104, b);
  parts.push(label(bx, by, 'B', 13, 600));
  const [ax, ay] = toward(cx, cy, 14, b + 180 + 35);
  parts.push(label(ax, ay, 'A', 13, 600));
  parts.push(side > 0 ? arc(cx, cy, 30, ref * 90, b, `${a}°`) : arc(cx, cy, 30, b, ref * 90, `${a}°`));
  return fitted(`B on a bearing from A, ${a} degrees from the ${COMPASS[ref]} line`, parts);
}

/** B on bearing `b` from A, the bearing drawn clockwise from north, with a dashed north line at B. */
export function bearingSvg(b: number, from = 'A', to = 'B', distance?: string): string {
  const cx = 120;
  const cy = 125;
  const len = 80;
  const parts: string[] = [];
  parts.push(northLine(cx, cy, 90));
  parts.push(leg(cx, cy, b, len));
  const [bx, by] = toward(cx, cy, len, b);
  parts.push(northLine(bx, by, 40, true));
  const [lx, ly] = toward(cx, cy, len + 16, b);
  parts.push(label(lx + (Math.sin(rad(b)) >= 0 ? 8 : -8), ly, to, 13, 600));
  const [ax, ay] = toward(cx, cy, 15, b + 180 + 35);
  parts.push(label(ax, ay, from, 13, 600));
  parts.push(arc(cx, cy, b > 300 || b < 60 ? 30 : 24, 0, b, `${pad(b)}°`));
  if (distance) {
    const [mx, my] = toward(cx, cy, len / 2, b);
    const [ox, oy] = toward(mx, my, 16, b + 90);
    parts.push(label(ox, oy, distance, 12));
  }
  return fitted(`${to} on a bearing of ${pad(b)} degrees from ${from}`, parts);
}

/**
 * A leg from the origin on a square grid, to scale, for a slider.
 *
 * Square and centred like `vectorSvg`, so the slider's marker, placed as a
 * fraction of the picture's width or height, lands on the grid's own values:
 * -span on the left or bottom edge, +span on the right or top.
 */
function gridLegSvg(b: number, d: number, span: number): string {
  const SIZE = 220;
  const unit = SIZE / (2 * span);
  const sx = (v: number) => SIZE / 2 + v * unit;
  const sy = (v: number) => SIZE / 2 - v * unit;
  const parts = [`<svg viewBox="0 0 ${SIZE} ${SIZE}" width="100%" role="img" aria-label="A leg of ${d} km on a bearing of ${pad(b)} degrees">`];
  const every = span > 10 ? 2 : 1;
  for (let i = -span + 1; i <= span - 1; i += 1) {
    if (i === 0 || i % every !== 0) continue;
    parts.push(
      `<line x1="${f1(sx(i))}" y1="0" x2="${f1(sx(i))}" y2="${SIZE}" stroke="currentColor" stroke-width="0.5" opacity="0.15" />`,
      `<line x1="0" y1="${f1(sy(i))}" x2="${SIZE}" y2="${f1(sy(i))}" stroke="currentColor" stroke-width="0.5" opacity="0.15" />`,
    );
  }
  parts.push(
    `<line x1="0" y1="${f1(sy(0))}" x2="${SIZE}" y2="${f1(sy(0))}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
    `<line x1="${f1(sx(0))}" y1="${SIZE}" x2="${f1(sx(0))}" y2="0" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
    label(sx(0) + 10, 10, 'N', 12, 600),
    label(SIZE - 8, sy(0) - 10, 'E', 12, 600),
  );
  const len = d * unit;
  parts.push(leg(sx(0), sy(0), b, len));
  parts.push(arc(sx(0), sy(0), 20, 0, b, `${pad(b)}°`));
  const [mx, my] = toward(sx(0), sy(0), len * 0.62, b);
  const [ox, oy] = toward(mx, my, 16, b + 90);
  parts.push(label(ox, oy, `${d} km`, 12));
  parts.push('</svg>');
  return parts.join('');
}

/* ---------- Lesson 1: bearings ---------- */

const PLACES: [string, string][] = [
  ['lighthouse', 'harbour'],
  ['church', 'station'],
  ['farm', 'village'],
  ['tower', 'bridge'],
  ['school', 'park'],
  ['castle', 'lake'],
  ['mill', 'ford'],
  ['beacon', 'camp'],
];

const POINTS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

interface CompassParams {
  point: number;
  place: number;
  back: boolean;
}

/** A compass point as a three-figure bearing, in either direction. */
const compass: Generator<CompassParams> = {
  id: 'vjour-compass',
  sample: (rng, difficulty) => ({
    point: rng.int(0, 7),
    place: rng.int(0, PLACES.length - 1),
    back: difficulty > 1 && rng.chance(0.5),
  }),
  render: ({ point, place, back }): Slide => {
    const [x, y] = PLACES[place];
    const out = point * 45;
    const answer = back ? mod360(out + 180) : out;
    const wrong = [mod360(answer + 90), mod360(360 - answer), mod360(answer + 180), mod360(answer + 270)];
    const picked = [...new Set(wrong.filter((w) => w !== answer))].slice(0, 3);
    const values = byValue([answer, ...picked]);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: back
            ? `The ${x} is ${POINTS[point]} of the ${y}. Find the bearing of the ${y} from the ${x}.`
            : `The ${x} is ${POINTS[point]} of the ${y}. Find the bearing of the ${x} from the ${y}.`,
        },
      ],
      options: values.map((v, i) => ({ id: `o${i}`, label: brg(v), tex: true })),
      correctId: `o${values.indexOf(answer)}`,
    };
  },
  solution: ({ point, place, back }) => {
    const [x, y] = PLACES[place];
    const out = point * 45;
    const steps: SolutionStep[] = [
      {
        text: `"The bearing of the ${x} from the ${y}" means stand at the ${y}, face north, and turn clockwise until you face the ${x}.`,
      },
      {
        text: `Each compass point is $45^\\circ$ further round than the one before, so ${POINTS[point]} is $${point} \\times 45^\\circ = ${brg(out)}$.`,
      },
    ];
    if (back) {
      steps.push({
        text: `This asks the other way: from the ${x} back to the ${y}, which is the opposite direction, $180^\\circ$ round.`,
      });
      steps.push({ tex: `${out < 180 ? `${out} + 180` : `${out} - 180`} = ${pad(mod360(out + 180))}` });
      steps.push({ text: `So the bearing is $${brg(mod360(out + 180))}$.` });
    } else {
      steps.push({ text: `So the bearing is $${brg(out)}$.` });
    }
    return steps;
  },
};

interface ReadParams {
  ref: number;
  side: number;
  a: number;
}

const readBearing = ({ ref, side, a }: ReadParams) => mod360(ref * 90 + side * a);

/** Reading a bearing off a diagram whose angle is drawn from any compass line. */
const read: Generator<ReadParams> = {
  id: 'vjour-read',
  choices: (params) => {
    const b = readBearing(params);
    const { ref, side, a } = params;
    const wrong = [a, mod360(360 - b), mod360(ref * 90 - side * a), mod360(b + 180), mod360(b + 90)];
    const picked = [...new Set(wrong.filter((w) => w !== b && w !== 0))].slice(0, 3);
    return options({ tex: brg(b), answer: `${b}` }, ...picked.map((w) => ({ tex: brg(w), answer: `${w}` })));
  },
  sample: (rng, difficulty) => ({
    ref: difficulty > 1 ? rng.int(0, 3) : rng.pick([0, 2]),
    side: rng.sign(),
    a: rng.int(10, 80),
  }),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'diagram', svg: readSvg(params.ref, params.side, params.a) },
      { kind: 'prose', text: 'Find the bearing of $B$ from $A$.' },
    ],
    lead: '\\text{bearing} =',
    keypad: [],
    answer: `${readBearing(params)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { ref, side, a } = params;
    const b = readBearing(params);
    const base = ref * 90;
    const steps: SolutionStep[] = [
      { text: 'A bearing is measured from north, clockwise, and written with three figures.' },
    ];
    if (ref === 0) {
      steps.push(
        side > 0
          ? { text: `The angle is already clockwise from north, so the bearing is $${brg(b)}$.` }
          : { text: `The angle is ${a}° anticlockwise from north. Clockwise, that is the rest of the full turn:` },
      );
      if (side < 0) steps.push({ tex: `360 - ${a} = ${b}` });
    } else {
      steps.push({
        text: `Turning clockwise from north, ${COMPASS[ref]} is at $${brg(base)}$. The angle turns ${side > 0 ? 'on, clockwise' : 'back, anticlockwise'}, from there:`,
      });
      steps.push({ tex: `${base} ${side > 0 ? '+' : '-'} ${a} = ${b}` });
    }
    steps.push({ text: `So the bearing of $B$ from $A$ is $${brg(b)}$.` });
    return steps;
  },
};

interface TurnParams {
  who: number;
  start: number;
  t: number;
  cw: boolean;
}

const turned = ({ start, t, cw }: TurnParams) => mod360(start + (cw ? t : -t));

/** A new bearing after turning clockwise or anticlockwise, wrapping past 360. */
const turn: Generator<TurnParams> = {
  id: 'vjour-turn',
  choices: (params) => {
    const { start, t, cw } = params;
    const right = turned(params);
    const raw = start + (cw ? t : -t);
    const wrong = [mod360(start + (cw ? -t : t)), raw, mod360(right + 180), mod360(360 - right), mod360(right + 90)];
    const picked = [...new Set(wrong.filter((w) => w !== right && w !== 0))].slice(0, 3);
    return options({ tex: brg(right), answer: `${right}` }, ...picked.map((w) => ({ tex: brg(w), answer: `${w}` })));
  },
  sample: (rng, difficulty) => {
    for (;;) {
      const params: TurnParams = {
        who: rng.int(0, WHO.length - 1),
        start: rng.int(2, 70) * 5,
        t: rng.int(3, 33) * 5,
        cw: rng.chance(0.5),
      };
      const raw = params.start + (params.cw ? params.t : -params.t);
      const wraps = raw >= 360 || raw <= 0;
      if (turned(params) === 0) continue;
      if (wraps === difficulty > 1) return params;
    }
  },
  render: ({ who, start, t, cw }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `${Who(who)} is heading on a bearing of $${brg(start)}$. It turns $${t}^\\circ$ ${cw ? 'clockwise' : 'anticlockwise'}. Find its new bearing.`,
      },
    ],
    lead: '\\text{bearing} =',
    keypad: [],
    answer: `${turned({ who, start, t, cw })}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { start, t, cw } = params;
    const raw = start + (cw ? t : -t);
    const right = turned(params);
    const steps: SolutionStep[] = [
      { text: `Bearings grow clockwise, so a clockwise turn adds and an anticlockwise turn takes away.` },
      { tex: `${start} ${cw ? '+' : '-'} ${t} = ${raw}` },
    ];
    if (raw >= 360) {
      steps.push({ text: 'That has gone past north, a full turn. Take $360^\\circ$ off:' });
      steps.push({ tex: `${raw} - 360 = ${right}` });
    } else if (raw < 0) {
      steps.push({ text: 'That has gone back past north. Add a full turn, $360^\\circ$:' });
      steps.push({ tex: `${raw} + 360 = ${right}` });
    }
    steps.push({ text: `The new bearing is $${brg(right)}$.` });
    return steps;
  },
};

const LETTERS: [string, string][] = [
  ['A', 'B'],
  ['P', 'Q'],
  ['X', 'Y'],
  ['R', 'S'],
  ['C', 'D'],
  ['L', 'M'],
];

interface BackParams {
  b: number;
  letters: number;
}

const backOf = (b: number) => (b < 180 ? b + 180 : b - 180);

/** The slips a back bearing invites: unchanged, measured anticlockwise, the wrong way round 360. */
function backWrong(b: number): number[] {
  const right = backOf(b);
  const wrong = [b, 360 - b, b < 180 ? 180 - b : b + 180, mod360(b + 90), mod360(right + 90)];
  return [...new Set(wrong.filter((w) => w !== right && w !== 0 && w !== 360))].slice(0, 3);
}

/** The back bearing: add 180 or take 180 away. */
const back: Generator<BackParams> = {
  id: 'vjour-back',
  choices: ({ b }) =>
    options(
      { tex: brg(backOf(b)), answer: `${backOf(b)}` },
      ...backWrong(b).map((w) => ({ tex: brg(w), answer: `${w}` })),
    ),
  sample: (rng, difficulty) => {
    for (;;) {
      const b = difficulty > 1 ? rng.int(1, 359) : rng.int(1, 71) * 5;
      if (b !== 180) return { b, letters: rng.int(0, LETTERS.length - 1) };
    }
  },
  render: ({ b, letters }): Slide => {
    const [p, q] = LETTERS[letters];
    const right = backOf(b);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'diagram', svg: bearingSvg(b, p, q) },
        { kind: 'prose', text: `The bearing of $${q}$ from $${p}$ is $${brg(b)}$. Find the bearing of $${p}$ from $${q}$.` },
      ],
      template: `\\text{bearing of } ${p} \\text{ from } ${q} = {0}`,
      bank: byValue([right, ...backWrong(b)]).map(brg),
      answer: [brg(right)],
    };
  },
  solution: ({ b, letters }) => {
    const [p, q] = LETTERS[letters];
    const right = backOf(b);
    return [
      {
        text: `Going back from $${q}$ to $${p}$ is the opposite direction, half a turn round: $180^\\circ$ different.`,
      },
      b < 180
        ? { text: `$${brg(b)}$ is less than $180^\\circ$, so add $180^\\circ$:` }
        : { text: `$${brg(b)}$ is more than $180^\\circ$, so take $180^\\circ$ away (adding would go past $360^\\circ$):` },
      { tex: b < 180 ? `${b} + 180 = ${right}` : `${b} - 180 = ${right}` },
      { text: `The bearing of $${p}$ from $${q}$ is $${brg(right)}$.` },
    ];
  },
};

/* ---------- Lesson 2: from a bearing to a vector ---------- */

interface SignsParams {
  who: number;
  b: number;
}

const SIGN_WORDS = ['east and north', 'east and south', 'west and south', 'west and north'];

/** Which way each component points, from the quadrant the bearing is in. */
const signs: Generator<SignsParams> = {
  id: 'vjour-signs',
  sample: (rng, difficulty) => {
    for (;;) {
      const b = difficulty > 1 ? rng.int(1, 359) : rng.int(1, 71) * 5;
      if (b % 90 !== 0) return { who: rng.int(0, WHO.length - 1), b };
    }
  },
  render: ({ who, b }): Slide => {
    const q = Math.floor(b / 90);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `${Who(who)} travels on a bearing of $${brg(b)}$. Which directions do its components point?`,
        },
      ],
      options: SIGN_WORDS.map((words, i) => ({ id: `q${i}`, label: words })),
      correctId: `q${q}`,
    };
  },
  solution: ({ b }) => {
    const q = Math.floor(b / 90);
    const [lo, hi] = [q * 90, q * 90 + 90];
    return [
      { text: 'East is $090^\\circ$, south $180^\\circ$ and west $270^\\circ$, so the four compass lines cut the turn into quarters.' },
      { text: `$${brg(b)}$ is between $${brg(lo)}$ and $${brg(hi)}$, so the journey heads ${SIGN_WORDS[q]}.` },
      {
        text: `Its east component is ${EAST_SIGN[q] > 0 ? 'positive' : 'negative (west)'} and its north component is ${NORTH_SIGN[q] > 0 ? 'positive' : 'negative (south)'}.`,
      },
    ];
  },
};

interface ComponentsParams {
  who: number;
  alpha: Acute;
  q: Quad;
  k: number;
}

const bearingOf = ({ alpha, q }: { alpha: Acute; q: Quad }) => bearingFrom(alpha, q);

/** The working shared by every bearing-to-components question. */
function componentLines({ alpha, q, k }: ComponentsParams): SolutionStep[] {
  const b = bearingFrom(alpha, q);
  const d = 2 * k;
  const { east, north } = componentsOf(alpha, q, k);
  const steps: SolutionStep[] = [];
  if (q === 0) {
    steps.push({ text: `The bearing $${brg(b)}$ is already the angle from north, $\\alpha = ${alpha}^\\circ$.` });
  } else {
    const line = q === 1 || q === 2 ? 'south' : 'north';
    steps.push({
      text: `The angle between the leg and the ${line} line is $\\alpha = ${alpha}^\\circ$. The leg heads ${SIGN_WORDS[q]}.`,
    });
  }
  steps.push({ tex: `\\text{east size} = ${d}\\sin ${alpha}^\\circ` });
  steps.push({ tex: `= ${d} \\times ${SIN_TEX[alpha]} = ${kmTex(east)}` });
  steps.push({ tex: `\\text{north size} = ${d}\\cos ${alpha}^\\circ` });
  steps.push({ tex: `= ${d} \\times ${COS_TEX[alpha]} = ${kmTex(north)}` });
  steps.push({ text: `With the signs: east $${surdTex(east)}$, north $${surdTex(north)}$.` });
  return steps;
}

function sampleComponents(rng: Draw, difficulty: number, maxK = 12): ComponentsParams {
  return {
    who: rng.int(0, WHO.length - 1),
    alpha: rng.pick(ACUTES),
    q: difficulty > 1 ? rng.pick(QUADS) : 0,
    k: rng.int(1, maxK),
  };
}

const COMPONENT_TEMPLATE = `\\text{east}: \\; {0} \\qquad \\text{north}: \\; {1}`;

/** A distance on a bearing as east and north components. */
const components: Generator<ComponentsParams> = {
  id: 'vjour-components',
  sample: (rng, difficulty) => sampleComponents(rng, difficulty),
  render: (params): Slide => {
    const { who, alpha, q, k } = params;
    const { east, north } = componentsOf(alpha, q, k);
    const answer = [surdTex(east), surdTex(north)];
    // Sine and cosine swapped, the signs forgotten, and the distance not halved.
    const wrong: Surd[] = [
      { c: east.c, r: north.r },
      { c: north.c, r: east.r },
      surdNeg(east),
      surdNeg(north),
      { c: 2 * east.c, r: east.r },
    ];
    const seen = new Set(answer);
    const extras: Surd[] = [];
    for (const w of wrong) {
      const t = surdTex(w);
      if (seen.has(t) || extras.length >= 3) continue;
      seen.add(t);
      extras.push(w);
    }
    const bank = [east, north, ...extras]
      .map((s) => ({ s, t: surdTex(s) }))
      .sort((x, y) => surdValue(x.s) - surdValue(y.s) || x.t.localeCompare(y.t))
      .map((x) => x.t);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${Who(who)} goes $${2 * k}$ km on a bearing of $${brg(bearingOf(params))}$. Find its displacement east and north, negative for west or south.`,
        },
      ],
      template: COMPONENT_TEMPLATE,
      bank,
      answer,
    };
  },
  solution: componentLines,
};

interface OneComponentParams extends ComponentsParams {
  north: boolean;
}

const oneOf = (params: OneComponentParams): Surd => {
  const { east, north } = componentsOf(params.alpha, params.q, params.k);
  return params.north ? north : east;
};

/** One component, typed as a surd. */
const oneComponent: Generator<OneComponentParams> = {
  id: 'vjour-one-component',
  choices: (params) => {
    const right = oneOf(params);
    const { east, north } = componentsOf(params.alpha, params.q, params.k);
    const other = params.north ? east : north;
    const wrong: Surd[] = [
      { c: right.c, r: other.r },
      surdNeg(right),
      { c: 2 * right.c, r: right.r },
      { c: right.c, r: right.r === 1 ? 3 : 1 },
      { c: -right.c, r: other.r },
    ];
    const values = [surdValue(right)];
    const picked: Surd[] = [];
    for (const w of wrong) {
      if (picked.length >= 3) break;
      if (values.some((v) => Math.abs(v - surdValue(w)) < 1e-9)) continue;
      values.push(surdValue(w));
      picked.push(w);
    }
    return options(
      { tex: surdTex(right), answer: surdMath(right) },
      ...picked.map((w) => ({ tex: surdTex(w), answer: surdMath(w) })),
    );
  },
  sample: (rng, difficulty) => ({ ...sampleComponents(rng, difficulty, 10), north: rng.chance(0.5) }),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `${Who(params.who)} goes $${2 * params.k}$ km on a bearing of $${brg(bearingOf(params))}$. Find its ${params.north ? 'north' : 'east'} component in km, negative for ${params.north ? 'south' : 'west'}.`,
      },
    ],
    lead: params.north ? '\\text{north component} =' : '\\text{east component} =',
    keypad: SURD_KEYS,
    answer: surdMath(oneOf(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const lines = componentLines(params);
    const right = oneOf(params);
    return [
      lines[0],
      ...(params.north ? lines.slice(3, 5) : lines.slice(1, 3)),
      { text: `So the ${params.north ? 'north' : 'east'} component is $${surdTex(right)}$ km.` },
    ];
  },
};

/** Bearings whose east or north component is exactly half the distance. */
const HALF: { b: number; north: boolean }[] = [
  { b: 30, north: false },
  { b: 60, north: true },
  { b: 120, north: true },
  { b: 150, north: false },
  { b: 210, north: false },
  { b: 240, north: true },
  { b: 300, north: true },
  { b: 330, north: false },
];

interface HalfParams {
  who: number;
  which: number;
  d: number;
}

const halfAnswer = ({ which, d }: HalfParams) => {
  const { b, north } = HALF[which];
  const v = north ? Math.cos(rad(b)) : Math.sin(rad(b));
  return Math.round(v * d);
};

/** Slide to a component that is half the distance: sin 30 and cos 60 read off a picture. */
const halfSlider: Generator<HalfParams> = {
  id: 'vjour-half-slider',
  sample: (rng, difficulty) => ({
    who: rng.int(0, WHO.length - 1),
    which: difficulty > 1 ? rng.int(0, HALF.length - 1) : rng.int(0, 1),
    d: 2 * rng.int(2, 8),
  }),
  render: (params): Slide => {
    const { who, which, d } = params;
    const { b, north } = HALF[which];
    const span = d + 1;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `${Who(who)} goes $${d}$ km on a bearing of $${brg(b)}$. Slide to its ${north ? 'north' : 'east'} component, negative for ${north ? 'south' : 'west'}.`,
        },
      ],
      min: -d,
      max: d,
      step: 1,
      answer: halfAnswer(params),
      readout: north ? '\\text{north} = {v}\\text{ km}' : '\\text{east} = {v}\\text{ km}',
      figure: {
        svg: gridLegSvg(b, d, span),
        xMin: -span,
        xMax: span,
        ...(north ? { axis: 'y' as const } : {}),
      },
    };
  },
  solution: (params) => {
    const { which, d } = params;
    const { b, north } = HALF[which];
    const q = Math.floor(b / 90) as Quad;
    const alpha = (q === 0 ? b : q === 1 ? 180 - b : q === 2 ? b - 180 : 360 - b) as Acute;
    const line = q === 1 || q === 2 ? 'south' : 'north';
    const answer = halfAnswer(params);
    const fn = north ? '\\cos' : '\\sin';
    return [
      {
        text: `The leg makes $\\alpha = ${alpha}^\\circ$ with the ${line} line${q === 0 ? ', which is the bearing itself' : ''}. It heads ${SIGN_WORDS[q]}.`,
      },
      { tex: `\\text{${north ? 'north' : 'east'} size} = ${d}${fn} ${alpha}^\\circ` },
      { tex: `= ${d} \\times \\frac{1}{2} = ${Math.abs(answer)}` },
      { text: `With its sign, the ${north ? 'north' : 'east'} component is $${answer}$ km.` },
    ];
  },
};

/* ---------- Lesson 3: from a vector to a bearing ---------- */

interface TripleParams {
  who: number;
  e: number;
  n: number;
  c: number;
}

function sampleTriple(rng: Draw, longest: number): TripleParams {
  const [a, b, c] = triple(rng, longest);
  return { who: rng.int(0, WHO.length - 1), e: a * rng.sign(), n: b * rng.sign(), c };
}

const endsUp = ({ who, e, n }: TripleParams) =>
  `${Who(who)} ends up $${Math.abs(e)}$ km ${ew(e)} and $${Math.abs(n)}$ km ${ns(n)} of its start.`;

/** How far from the start: Pythagoras on the two components. */
const distance: Generator<TripleParams> = {
  id: 'vjour-distance',
  choices: ({ e, n, c }) => {
    const [x, y] = [Math.abs(e), Math.abs(n)];
    return signedChoices(c, [x + y, c * c, Math.abs(x - y)]);
  },
  sample: (rng, difficulty) => sampleTriple(rng, difficulty > 1 ? 50 : 26),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: `${endsUp(params)} How far is it from its start, in km?` }],
    lead: '\\text{distance} =',
    keypad: [{ insert: 'sqrt(', label: '√(' }],
    answer: `${params.c}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ e, n, c }) => [
    { text: 'East and north are at right angles, so the straight-line distance is the hypotenuse:' },
    { tex: `d = \\sqrt{${Math.abs(e)}^2 + ${Math.abs(n)}^2}` },
    { tex: `= \\sqrt{${e * e} + ${n * n}} = ${c}` },
    { text: `It is $${c}$ km from its start. Which way it went does not change the squares.` },
  ],
};

/** tan of the angle to the north-south line: east over north, sizes only. */
const alphaTan: Generator<TripleParams> = {
  id: 'vjour-alpha',
  choices: ({ e, n, c }) => {
    const [x, y] = [Math.abs(e), Math.abs(n)];
    return options(
      { tex: fracTex(x, y), answer: `${x}/${y}` },
      { tex: fracTex(y, x), answer: `${y}/${x}` },
      { tex: fracTex(x, c), answer: `${x}/${c}` },
      { tex: fracTex(y, c), answer: `${y}/${c}` },
    );
  },
  sample: (rng, difficulty) => sampleTriple(rng, difficulty > 1 ? 50 : 26),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `${endsUp(params)} $\\alpha$ is the angle between its displacement and the north-south line. Find $\\tan\\alpha$.`,
      },
    ],
    lead: '\\tan\\alpha =',
    keypad: [{ insert: '/' }],
    answer: `${Math.abs(params.e)}/${Math.abs(params.n)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ e, n }) => {
    const [x, y] = [Math.abs(e), Math.abs(n)];
    const simple = fracTex(x, y);
    return [
      {
        text: `In the right-angled triangle, the north-south side ($${y}$) is next to $\\alpha$ and the east-west side ($${x}$) is opposite it.`,
      },
      { tex: '\\tan\\alpha = \\frac{\\text{east size}}{\\text{north size}}' },
      { tex: `= \\frac{${x}}{${y}}${simple === `\\frac{${x}}{${y}}` ? '' : ` = ${simple}`}` },
      { text: 'Sizes only: the signs decide the quadrant later, not the angle.' },
    ];
  },
};

interface ToBearingParams {
  who: number;
  alpha: Acute;
  q: Quad;
  k: number;
}

/** The bearing of a displacement with exact components, by quadrant. */
const toBearing: Generator<ToBearingParams> = {
  id: 'vjour-to-bearing',
  choices: ({ alpha, q }) => {
    const right = bearingFrom(alpha, q);
    const all = QUADS.map((p) => bearingFrom(alpha, p));
    return options(
      { tex: brg(right), answer: `${right}` },
      ...all.filter((b) => b !== right).map((b) => ({ tex: brg(b), answer: `${b}` })),
    );
  },
  sample: (rng) => ({
    who: rng.int(0, WHO.length - 1),
    alpha: rng.pick(ACUTES),
    q: rng.pick(QUADS),
    k: rng.int(1, 12),
  }),
  render: ({ who, alpha, q, k }): Slide => {
    const { east, north } = componentsOf(alpha, q, k);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `${Who(who)} ends up $${kmTex(east)}$ km ${ew(east.c)} and $${kmTex(north)}$ km ${ns(north.c)} of its start. Find the bearing of where it ends up from its start.`,
        },
      ],
      lead: '\\text{bearing} =',
      keypad: [],
      answer: `${bearingFrom(alpha, q)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ alpha, q, k }) => {
    const { east, north } = componentsOf(alpha, q, k);
    const b = bearingFrom(alpha, q);
    const ratio = `\\frac{${kmTex(east)}}{${kmTex(north)}}`;
    return [
      { text: '$\\alpha$ is the angle to the north-south line. Sizes only:' },
      { tex: `\\tan\\alpha = ${ratio} = ${TAN_TEX[alpha]}` },
      { tex: `\\alpha = ${alpha}^\\circ` },
      { text: `It went ${SIGN_WORDS[q]}, so the bearing is $${RULE_TEX[q]}$:` },
      { tex: q === 0 ? `\\text{bearing} = ${pad(b)}^\\circ` : `${RULE_TEX[q].replace(/\\alpha/, `${alpha}^\\circ`)} = ${pad(b)}^\\circ` },
    ];
  },
};

/** Which rule turns the angle into a bearing, walked as a decision. */
const quadrantFlow: Generator<TripleParams> = {
  id: 'vjour-quadrant-flow',
  sample: (rng, difficulty) => sampleTriple(rng, difficulty > 1 ? 50 : 30),
  render: (params): Slide => {
    const { who, e, n } = params;
    // Tenths, so 180 - 36.9 is exactly 143.1 and never 143.10000000000002.
    const a = Math.round((Math.atan(Math.abs(e) / Math.abs(n)) * 1800) / Math.PI);
    const t = (tenths: number) => (tenths / 10).toFixed(1);
    const alpha = t(a);
    const outcome = (q: Quad) => {
      const value = [a, 1800 - a, 1800 + a, 3600 - a][q];
      const b = t(value).padStart(5, '0');
      return q === 0
        ? `The bearing is $\\alpha = ${b}^\\circ$.`
        : `The bearing is $${RULE_TEX[q]} = ${b}^\\circ$.`;
    };
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `${endsUp(params)} The angle between its displacement and the north-south line is $\\alpha = ${alpha}^\\circ$. Find the bearing of where it ends up from its start.`,
        },
      ],
      subject: `${Math.abs(e)}\\text{ km ${ew(e)}}, \\; ${Math.abs(n)}\\text{ km ${ns(n)}}`,
      steps: [
        {
          id: 'side',
          ask: `Is the end east or west of the ${whoName(who)}'s start?`,
          branches: [
            { label: 'East', to: 'east' },
            { label: 'West', to: 'west' },
          ],
        },
        {
          id: 'east',
          ask: 'Is it north or south of the start?',
          branches: [
            { label: 'North', outcome: outcome(0) },
            { label: 'South', outcome: outcome(1) },
          ],
        },
        {
          id: 'west',
          ask: 'Is it north or south of the start?',
          branches: [
            { label: 'North', outcome: outcome(3) },
            { label: 'South', outcome: outcome(2) },
          ],
        },
      ],
      answer: [e > 0 ? 'East' : 'West', n > 0 ? 'North' : 'South'],
    };
  },
  solution: ({ e, n }) => {
    const q = quadOf(e, n);
    const a = Math.round((Math.atan(Math.abs(e) / Math.abs(n)) * 1800) / Math.PI);
    const value = [a, 1800 - a, 1800 + a, 3600 - a][q];
    return [
      { text: `It went ${SIGN_WORDS[q]}, so the end is in that quarter of the compass.` },
      { text: `There the bearing is $${RULE_TEX[q]}$, with $\\alpha$ measured from the ${q === 1 || q === 2 ? 'south' : 'north'} line.` },
      { tex: q === 0 ? `\\text{bearing} = ${(a / 10).toFixed(1)}^\\circ` : `${RULE_TEX[q].replace(/\\alpha/, `${(a / 10).toFixed(1)}^\\circ`)} = ${(value / 10).toFixed(1)}^\\circ` },
    ];
  },
};

/* ---------- Lesson 4: journeys with several legs ---------- */

interface LegsParams {
  who: number;
  legs: Vec[];
}

const sumOf = (legs: Vec[]): Vec => legs.reduce<Vec>((s, l) => [s[0] + l[0], s[1] + l[1]], [0, 0]);

const legsDisplay = (legs: Vec[]) => legs.map((l) => columnTex(l[0], l[1])).join(' + ');

/** The total displacement of two or three legs. */
const legsTotal: Generator<LegsParams> = {
  id: 'vjour-legs-total',
  sample: (rng, difficulty) => {
    const count = difficulty > 1 ? 3 : 2;
    const legs: Vec[] = [];
    for (let i = 0; i < count; i += 1) {
      const x = rng.int(-9, 9);
      const y = rng.int(-9, 9);
      legs.push([x === 0 ? 4 : x, y === 0 ? -3 : y]);
    }
    return { who: rng.int(0, WHO.length - 1), legs };
  },
  render: ({ who, legs }): Slide => {
    const total = sumOf(legs);
    const answer = [`${total[0]}`, `${total[1]}`];
    // The last leg dropped, a leg taken away instead of added, and the totals swapped.
    const partial = sumOf(legs.slice(0, -1));
    const last = legs[legs.length - 1];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `${Who(who)} makes the legs below, each written as (east, north) in km. Find its total displacement.`,
        },
        { kind: 'display', tex: legsDisplay(legs) },
      ],
      template: COMPONENT_TEMPLATE,
      bank: bankOf(answer, [`${partial[0]}`, `${partial[1] - last[1]}`, `${total[1]}`, `${total[0]}`, `${partial[0] - last[0]}`]),
      answer,
    };
  },
  solution: ({ legs }) => {
    const total = sumOf(legs);
    return [
      { text: 'The legs join end to end, so the total displacement is their sum. Add the east parts, then the north parts:' },
      { tex: `\\text{east}: \\; ${legs.map((l, i) => (i === 0 ? `${l[0]}` : paren(l[0]))).join(' + ')} = ${total[0]}` },
      { tex: `\\text{north}: \\; ${legs.map((l, i) => (i === 0 ? `${l[1]}` : paren(l[1]))).join(' + ')} = ${total[1]}` },
      { text: `So it ends up at $${columnTex(total[0], total[1])}$ km from its start.` },
    ];
  },
};

/** A tree bank: the answer plus up to four near misses, sorted. */
function treeBank(answer: string[], candidates: number[]): string[] {
  const needed = new Set(answer);
  const extras: string[] = [];
  for (const candidate of candidates.map(String)) {
    if (extras.length >= 4) break;
    if (needed.has(candidate) || extras.includes(candidate)) continue;
    extras.push(candidate);
  }
  return [...answer, ...extras].sort((p, q) => Number(p) - Number(q));
}

/** Two legs to a total, then how far from the start: a triple, so it is whole. */
const tripTree: Generator<LegsParams & { c: number }> = {
  id: 'vjour-trip-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const [a, b, c] = triple(rng, difficulty > 1 ? 26 : 15);
      const total: Vec = [a * rng.sign(), b * rng.sign()];
      const first: Vec = [rng.int(-9, 9), rng.int(-9, 9)];
      const second: Vec = [total[0] - first[0], total[1] - first[1]];
      if ([...first, ...second].some((v) => v === 0 || Math.abs(v) > 14)) continue;
      return { who: rng.int(0, WHO.length - 1), legs: [first, second], c };
    }
  },
  render: ({ who, legs, c }): Slide => {
    const [e, n] = sumOf(legs);
    const answer = [`${e}`, `${n}`, `${c}`];
    const [[e1, n1], [e2, n2]] = legs;
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `${Who(who)} makes the two legs below, as (east, north) in km. Find the total east, the total north, then its distance from the start.`,
        },
        { kind: 'display', tex: legsDisplay(legs) },
      ],
      expression: `\\sqrt{(${e1} + ${paren(e2)})^2 + (${n1} + ${paren(n2)})^2}`,
      nodes: [
        { id: 'e', from: [] },
        { id: 'n', from: [] },
        { id: 'd', from: ['e', 'n'] },
      ],
      bank: treeBank(answer, [e1 - e2, n1 - n2, Math.abs(e) + Math.abs(n), c + 1, c * c, -e, -n]),
      answer,
    };
  },
  solution: ({ legs, c }) => {
    const [e, n] = sumOf(legs);
    const [[e1, n1], [e2, n2]] = legs;
    return [
      { text: 'Add the legs part by part:' },
      { tex: `\\text{east}: \\; ${e1} + ${paren(e2)} = ${e}` },
      { tex: `\\text{north}: \\; ${n1} + ${paren(n2)} = ${n}` },
      { text: 'The distance from the start is the length of the total, by Pythagoras:' },
      { tex: `\\sqrt{${paren(e)}^2 + ${paren(n)}^2} = \\sqrt{${e * e + n * n}} = ${c}` },
    ];
  },
};

interface HomeParams {
  who: number;
  /** Legs as compass words: [axis, signed km], axis 'ns' or 'ew'. */
  legs: ['ns' | 'ew', number][];
}

const homeTotal = ({ legs }: HomeParams): Vec => [
  legs.filter(([axis]) => axis === 'ew').reduce((s, [, v]) => s + v, 0),
  legs.filter(([axis]) => axis === 'ns').reduce((s, [, v]) => s + v, 0),
];

const legWords = ([axis, v]: ['ns' | 'ew', number]) => `$${Math.abs(v)}$ km ${axis === 'ns' ? ns(v) : ew(v)}`;

/** The bearing straight back to the start, after legs whose total makes 45 degrees. */
const home: Generator<HomeParams> = {
  id: 'vjour-home',
  choices: (params) => {
    const [e, n] = homeTotal(params);
    const right = bearingFrom(45, quadOf(-e, -n));
    const out = bearingFrom(45, quadOf(e, n));
    const rest = [45, 135, 225, 315].filter((b) => b !== right && b !== out);
    return options(
      { tex: brg(right), answer: `${right}` },
      { tex: brg(out), answer: `${out}` },
      ...rest.map((b) => ({ tex: brg(b), answer: `${b}` })),
    );
  },
  sample: (rng, difficulty) => {
    const who = rng.int(0, WHO.length - 1);
    const k = rng.int(2, 12);
    const [se, sn] = [rng.sign(), rng.sign()];
    if (difficulty < 2) {
      const first: ['ns' | 'ew', number] = ['ns', sn * k];
      const second: ['ns' | 'ew', number] = ['ew', se * k];
      return { who, legs: rng.chance(0.5) ? [first, second] : [second, first] };
    }
    for (;;) {
      const m1 = rng.int(1, 14) * rng.sign();
      const m2 = sn * k - m1;
      if (m2 === 0 || Math.abs(m2) > 15) continue;
      return { who, legs: [['ns', m1], ['ew', se * k], ['ns', m2]] };
    }
  },
  render: (params): Slide => {
    const [e, n] = homeTotal(params);
    const words = params.legs.map(legWords);
    const list = words.length === 2 ? `${words[0]}, then ${words[1]}` : `${words[0]}, then ${words[1]}, then ${words[2]}`;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `${Who(params.who)} goes ${list}. On what bearing must it go to head straight back to its start?`,
        },
      ],
      lead: '\\text{bearing} =',
      keypad: [],
      answer: `${bearingFrom(45, quadOf(-e, -n))}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const [e, n] = homeTotal(params);
    const k = Math.abs(e);
    const out = bearingFrom(45, quadOf(e, n));
    const right = bearingFrom(45, quadOf(-e, -n));
    return [
      { text: `Add the legs: it ends up $${k}$ km ${ew(e)} and $${k}$ km ${ns(n)} of its start.` },
      { tex: `\\tan\\alpha = \\frac{${k}}{${k}} = 1` },
      { tex: '\\alpha = 45^\\circ' },
      { text: `Heading ${SIGN_WORDS[quadOf(e, n)]}, the bearing of the end from the start is $${brg(out)}$.` },
      { text: 'Going back is the opposite direction, $180^\\circ$ round:' },
      { tex: out < 180 ? `${out} + 180 = ${pad(right)}` : `${out} - 180 = ${pad(right)}` },
      { text: `So it heads back on $${brg(right)}$, for $${k}\\sqrt{2}$ km.` },
    ];
  },
};

/* ---------- Lesson 5: currents and wind ---------- */

type Setting = 'boat' | 'plane';

const MS = '\\text{m s}^{-1}';
const KMH = '\\text{km h}^{-1}';

/** A vector in i, j form: `3\mathbf{i} - \mathbf{j}`. */
function ijTex([x, y]: Vec): string {
  const term = (c: number, unit: string) => (Math.abs(c) === 1 ? unit : `${Math.abs(c)}${unit}`);
  if (x === 0 && y === 0) return '\\mathbf{0}';
  if (x === 0) return `${y < 0 ? '-' : ''}${term(y, '\\mathbf{j}')}`;
  const first = `${x < 0 ? '-' : ''}${term(x, '\\mathbf{i}')}`;
  if (y === 0) return first;
  return `${first} ${y < 0 ? '-' : '+'} ${term(y, '\\mathbf{j}')}`;
}

const withUnit = (v: Vec, unit: string) => `{(${ijTex(v)}) \\; ${unit}}`;

interface CurrentParams {
  setting: Setting;
  own: Vec;
  flow: Vec;
}

/** A velocity plus a current or a wind, component by component. */
const current: Generator<CurrentParams> = {
  id: 'vjour-current',
  sample: (rng, difficulty) => {
    const setting: Setting = rng.chance(0.5) ? 'boat' : 'plane';
    const scale = setting === 'plane' ? 10 : 1;
    const nz = (lo: number, hi: number) => {
      const v = rng.int(lo, hi);
      return v === 0 ? hi : v;
    };
    const own: Vec = [nz(-9, 9) * scale, nz(-9, 9) * scale];
    const along = rng.int(1, 6) * rng.sign() * scale;
    const flow: Vec =
      difficulty > 1
        ? [nz(-6, 6) * scale, nz(-6, 6) * scale]
        : rng.chance(0.5)
          ? [along, 0]
          : [0, along];
    return { setting, own, flow };
  },
  render: ({ setting, own, flow }): Slide => {
    const unit = setting === 'plane' ? KMH : MS;
    const total: Vec = [own[0] + flow[0], own[1] + flow[1]];
    const answer = [`${total[0]}`, `${total[1]}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text:
            setting === 'boat'
              ? `A boat's velocity through the water is $${withUnit(own, unit)}$. The current's velocity is $${withUnit(flow, unit)}$. Find the boat's resultant velocity ($\\mathbf{i}$ east, $\\mathbf{j}$ north).`
              : `A plane's velocity through the air is $${withUnit(own, unit)}$. The wind's velocity is $${withUnit(flow, unit)}$. Find the plane's resultant velocity ($\\mathbf{i}$ east, $\\mathbf{j}$ north).`,
        },
      ],
      template: VECTOR_TEMPLATE,
      // The current taken away, and the own velocity left alone.
      bank: bankOf(answer, [`${own[0] - flow[0]}`, `${own[1] - flow[1]}`, `${own[0]}`, `${own[1]}`]),
      answer,
    };
  },
  solution: ({ setting, own, flow }) => {
    const total: Vec = [own[0] + flow[0], own[1] + flow[1]];
    return [
      {
        text: `The ${setting === 'boat' ? 'current carries the boat' : 'wind carries the plane'} along as well, so the resultant velocity is the sum:`,
      },
      { tex: `\\mathbf{i}: \\; ${own[0]} + ${paren(flow[0])} = ${total[0]}` },
      { tex: `\\mathbf{j}: \\; ${own[1]} + ${paren(flow[1])} = ${total[1]}` },
      { text: `So the resultant velocity is $${withUnit(total, setting === 'plane' ? KMH : MS)}$.` },
    ];
  },
};

interface GroundParams {
  setting: Setting;
  /** Heading, as a compass line 0 N, 1 E, 2 S, 3 W. */
  head: number;
  /** Which side the current or wind pushes: +1 clockwise of the heading. */
  side: number;
  v: number;
  w: number;
  c: number;
}

/** Speed over the ground, heading straight while the water or air pushes sideways. */
const groundSpeed: Generator<GroundParams> = {
  id: 'vjour-ground-speed',
  choices: ({ v, w, c }) => signedChoices(c, [v + w, c * c, Math.abs(v - w)]),
  sample: (rng, difficulty) => {
    const setting: Setting = rng.chance(0.5) ? 'boat' : 'plane';
    const [a, b, c] = triple(rng, difficulty > 1 ? 30 : 15);
    const scale = setting === 'plane' ? 10 : 1;
    // The boat or plane is the faster: the longer leg is its own speed.
    const [v, w] = a > b ? [a, b] : [b, a];
    return { setting, head: rng.int(0, 3), side: rng.sign(), v: v * scale, w: w * scale, c: c * scale };
  },
  render: ({ setting, head, side, v, w, c }): Slide => {
    const unit = setting === 'plane' ? KMH : MS;
    const push = COMPASS[mod360(head * 90 + side * 90) / 90];
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text:
            setting === 'boat'
              ? `A boat heads due ${COMPASS[head]} at $${v} \\; ${unit}$ through the water. A current flows due ${push} at $${w} \\; ${unit}$. Find the boat's speed over the ground.`
              : `A plane heads due ${COMPASS[head]} at $${v} \\; ${unit}$ through the air. A wind blows due ${push} at $${w} \\; ${unit}$. Find the plane's speed over the ground.`,
        },
      ],
      lead: '\\text{speed} =',
      keypad: [{ insert: 'sqrt(', label: '√(' }],
      answer: `${c}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ setting, v, w, c }) => [
    {
      text: `The two velocities are at right angles, so the resultant is the hypotenuse of a right-angled triangle, and the ${setting === 'boat' ? 'boat' : 'plane'}'s speed over the ground is its length:`,
    },
    { tex: `\\sqrt{${v}^2 + ${w}^2}` },
    { tex: `= \\sqrt{${v * v} + ${w * w}} = ${c}` },
    { text: `The speed over the ground is $${c} \\; ${setting === 'plane' ? KMH : MS}$, faster than either on its own.` },
  ],
};

interface CrossParams {
  /** The way across: 0 north or 2 south. */
  across: number;
  /** The way the river flows: 1 east or 3 west. */
  flows: number;
  c: number;
  v: number;
  /** Speed across, from the triple. */
  s: number;
}

/** Speed straight across a river, steering upstream: the boat's speed is the hypotenuse. */
const across: Generator<CrossParams> = {
  id: 'vjour-across',
  choices: ({ c, v, s }) => signedChoices(s, [v - c, v + c, s * s]),
  sample: (rng, difficulty) => {
    const [a, b, h] = triple(rng, difficulty > 1 ? 30 : 15);
    return { across: rng.pick([0, 2]), flows: rng.pick([1, 3]), c: a, v: h, s: b };
  },
  render: ({ across: way, flows, c, v, s }): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `A river flows due ${COMPASS[flows]} at $${c} \\; ${MS}$. A boat moves at $${v} \\; ${MS}$ through the water and steers upstream so that it travels due ${COMPASS[way]}, straight across. Find its speed across.`,
      },
    ],
    lead: '\\text{speed} =',
    keypad: [{ insert: 'sqrt(', label: '√(' }],
    answer: `${s}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ c, v, s }) => [
    {
      text: `The boat's own velocity is the hypotenuse, $${v}$. Its upstream part cancels the current, $${c}$, and what is left carries it across:`,
    },
    { tex: `\\sqrt{${v}^2 - ${c}^2}` },
    { tex: `= \\sqrt{${v * v} - ${c * c}} = ${s}` },
    { text: `It crosses at $${s} \\; ${MS}$, slower than $${v}$ because some of its effort goes on the current.` },
  ],
};

interface SteerParams {
  across: number;
  flows: number;
  c: number;
  /** 30: the boat is twice the current's speed; 45: root 2 times it. */
  alpha: 30 | 45;
}

/** The heading upstream: 90 turned towards the current's source. */
function steerOf({ across: way, flows, alpha }: SteerParams): number {
  const base = way * 90;
  // Upstream is against the flow: a river flowing east pushes the heading west.
  const towards = flows === 1 ? -1 : 1;
  return mod360(base + (way === 0 ? towards : -towards) * alpha);
}

/** The bearing to steer so the resultant goes straight across. */
const steer: Generator<SteerParams> = {
  id: 'vjour-steer',
  sample: (rng, difficulty) => ({
    across: rng.pick([0, 2]),
    flows: rng.pick([1, 3]),
    c: rng.int(1, 15),
    alpha: difficulty > 1 && rng.chance(0.5) ? 45 : 30,
  }),
  render: (params): Slide => {
    const { across: way, flows, c, alpha } = params;
    const right = steerOf(params);
    const base = way * 90;
    const mirror = mod360(2 * base - right);
    const upstream = flows === 1 ? 270 : 90;
    const values = byValue([right, mirror, base, upstream]);
    const speed = alpha === 30 ? `${2 * c}` : c === 1 ? '\\sqrt{2}' : `${c}\\sqrt{2}`;
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `A river flows due ${COMPASS[flows]} at $${c} \\; ${MS}$. A boat moves at $${speed} \\; ${MS}$ through the water. On what bearing should it steer to travel due ${COMPASS[way]}, straight across?`,
        },
      ],
      options: values.map((v, i) => ({ id: `o${i}`, label: brg(v), tex: true })),
      correctId: `o${values.indexOf(right)}`,
    };
  },
  solution: (params) => {
    const { across: way, flows, c, alpha } = params;
    const right = steerOf(params);
    const speed = alpha === 30 ? `${2 * c}` : c === 1 ? '\\sqrt{2}' : `${c}\\sqrt{2}`;
    const up = flows === 1 ? 'west' : 'east';
    return [
      {
        text: `To go straight across, the boat's own velocity must have an upstream part that cancels the current. Aim ${up} of due ${COMPASS[way]} by an angle $\\alpha$, with`,
      },
      { tex: `\\sin\\alpha = \\frac{${c}}{${speed}} = ${alpha === 30 ? '\\frac{1}{2}' : '\\frac{1}{\\sqrt{2}}'}` },
      { tex: `\\alpha = ${alpha}^\\circ` },
      { text: `Turning from $${brg(way * 90)}$ towards the ${up}, the bearing is $${brg(right)}$.` },
    ];
  },
};

export const vectorBearingsGenerators: Generator<never>[] = [
  compass,
  read,
  turn,
  back,
  signs,
  components,
  oneComponent,
  halfSlider,
  distance,
  alphaTan,
  toBearing,
  quadrantFlow,
  legsTotal,
  tripTree,
  home,
  current,
  groundSpeed,
  across,
  steer,
] as Generator<never>[];

