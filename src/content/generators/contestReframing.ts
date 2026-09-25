/**
 * Contest Math, level 11: Reframing Problems.
 *
 * Four lessons, each about swapping a hard question for an easier one that
 * has the same answer. A knockout needs one match per player knocked out, so
 * the rounds and byes never need drawing; a route through a grid is a word of
 * rights and ups; a share of sweets is a row of sweets and dividers. Then the
 * strategies that find such a swap: work backwards from the end, draw it,
 * count small cases first. Cubes assembled from smaller cubes are sorted by
 * where they sit (corner, edge, face, hidden), which settles how much of each
 * one shows. Last, numbers that describe themselves: look-and-say terms,
 * numbers whose digits count their own digits, and digit sums, which keep a
 * number's remainder on division by 9.
 *
 * Level 6 already asks the painted cube (`cm-painted-cube`,
 * `cm-painted-table`); the cube questions here go the other way, from the
 * finished outside back to the cubes it needs.
 *
 * Shared helpers are in `contestMath.ts`.
 */
import type { ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import { options } from '../choiceVariant';
import { choiceSlide } from './numberProof';
import { num, numberBank, numberOptions, say, show, typed } from './contestMath';

/* ================================================================
 * Shared pieces
 * ================================================================ */

/** n choose k, exactly, for the small values asked here. */
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let out = 1;
  for (let i = 1; i <= k; i += 1) out = (out * (n - k + i)) / i;
  return Math.round(out);
}

const binom = (n: number, k: number) => `\\binom{${n}}{${k}}`;

/** 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st. */
function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
}

const digitSum = (n: number): number =>
  String(n)
    .split('')
    .reduce((t, d) => t + Number(d), 0);

/** The single digit left by adding digits over and over: the remainder on division by 9, with 9 for 0. */
const digitalRoot = (n: number): number => (n % 9 === 0 ? 9 : n % 9);

const f1 = (v: number) => v.toFixed(1);

const line = (x1: number, y1: number, x2: number, y2: number, width = 2) =>
  `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="currentColor" stroke-width="${width}" />`;

const label = (x: number, y: number, text: string) =>
  `<text x="${f1(x)}" y="${f1(y)}" font-size="14" fill="currentColor" text-anchor="middle" dominant-baseline="middle">${text}</text>`;

const spot = (x: number, y: number) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="4" fill="currentColor" />`;

/**
 * A grid of streets `a` blocks across and `b` blocks up. With `ends`, the
 * corners A (bottom left) and B (top right) are marked, and `via` marks P.
 * Labels sit outside the grid, or inside a block for P, clear of every line.
 */
function gridSvg(a: number, b: number, ends: boolean, via?: [number, number]): string {
  const s = Math.min(240 / a, 130 / b, 44);
  const w = a * s;
  const h = b * s;
  const x0 = (300 - w) / 2;
  const y0 = 26;
  const X = (i: number) => x0 + i * s;
  const Y = (j: number) => y0 + h - j * s;
  const parts: string[] = [];
  for (let i = 0; i <= a; i += 1) parts.push(line(X(i), Y(0), X(i), Y(b)));
  for (let j = 0; j <= b; j += 1) parts.push(line(X(0), Y(j), X(a), Y(j)));
  if (ends) {
    parts.push(spot(X(0), Y(0)), spot(X(a), Y(b)), label(X(0) - 13, Y(0) + 13, 'A'), label(X(a) + 13, Y(b) - 13, 'B'));
  }
  if (via) parts.push(spot(X(via[0]), Y(via[1])), label(X(via[0]) - s / 2, Y(via[1]) - s / 2, 'P'));
  const desc = ends ? `A grid of streets ${a} blocks across and ${b} blocks up` : `A grid of ${b} by ${a} unit squares`;
  return [`<svg viewBox="0 0 300 ${Math.round(h + 52)}" width="100%" role="img" aria-label="${desc}">`, ...parts, '</svg>'].join('');
}

/* ---------- an a × b × c block of unit cubes, drawn in isometric ---------- */

type P2 = [number, number];

const iso = ([x, y, z]: [number, number, number]): P2 => [(x - y) * Math.cos(Math.PI / 6), -(x + y) * 0.5 + z];

function blockSvg([a, b, c]: [number, number, number]): string {
  const corners: P2[] = [];
  for (const x of [0, a]) for (const y of [0, b]) for (const z of [0, c]) corners.push(iso([x, y, z]));
  const xs = corners.map((p) => p[0]);
  const ys = corners.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxY = Math.max(...ys);
  const w = Math.max(...xs) - minX;
  const hh = maxY - Math.min(...ys);
  const pad = 16;
  const k = Math.min((300 - 2 * pad) / w, (170 - 2 * pad) / hh);
  const x0 = (300 - w * k) / 2;
  const P = (x: number, y: number, z: number): P2 => {
    const [u, v] = iso([x, y, z]);
    return [x0 + (u - minX) * k, pad + (maxY - v) * k];
  };
  const thin = (p: P2, q: P2) => line(p[0], p[1], q[0], q[1], 1).replace(' />', ' stroke-opacity="0.4" />');
  const face = (pts: P2[]) => `<path d="${pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${f1(x)} ${f1(y)}`).join(' ')} Z" fill="none" stroke="currentColor" stroke-width="2" />`;
  const parts: string[] = [];
  for (let i = 1; i < a; i += 1) parts.push(thin(P(i, 0, c), P(i, b, c)), thin(P(i, b, 0), P(i, b, c)));
  for (let j = 1; j < b; j += 1) parts.push(thin(P(0, j, c), P(a, j, c)), thin(P(a, j, 0), P(a, j, c)));
  for (let z = 1; z < c; z += 1) parts.push(thin(P(a, 0, z), P(a, b, z)), thin(P(0, b, z), P(a, b, z)));
  parts.push(
    face([P(0, 0, c), P(a, 0, c), P(a, b, c), P(0, b, c)]),
    face([P(a, 0, 0), P(a, b, 0), P(a, b, c), P(a, 0, c)]),
    face([P(0, b, 0), P(a, b, 0), P(a, b, c), P(0, b, c)]),
  );
  const height = hh * k + 2 * pad;
  return [`<svg viewBox="0 0 300 ${Math.round(height)}" width="100%" role="img" aria-label="A ${a} by ${b} by ${c} block of unit cubes">`, ...parts, '</svg>'].join('');
}

type Dims = [number, number, number];

const isCube = ([a, b, c]: Dims) => a === b && b === c;

const dimsTex = ([a, b, c]: Dims) => `${a} \\times ${b} \\times ${c}`;

/** How many unit cubes sit at corners, along edges, in the middle of faces, and hidden inside. */
function roles([a, b, c]: Dims) {
  const [x, y, z] = [a - 2, b - 2, c - 2];
  return { corners: 8, edges: 4 * (x + y + z), faces: 2 * (x * y + y * z + x * z), hidden: x * y * z };
}

/* ================================================================
 * Lesson 1: Reframing Problems
 * ================================================================ */

/* ---------- a knockout: one match per player knocked out ---------- */

const EVENTS = [
  { event: 'tennis tournament', who: 'players', game: 'match', games: 'matches' },
  { event: 'chess knockout', who: 'players', game: 'game', games: 'games' },
  { event: 'football cup', who: 'teams', game: 'match', games: 'matches' },
  { event: 'table tennis competition', who: 'players', game: 'match', games: 'matches' },
];

/** Contests where three play at once, for difficulty 2. */
const THREE_EVENTS = [
  { event: 'game show', who: 'contestants', game: 'heat', games: 'heats' },
  { event: 'karting championship', who: 'drivers', game: 'race', games: 'races' },
];

interface KnockoutParams {
  event: number;
  n: number;
  /** Difficulty 2: each game is played by three, and only its winner goes through. */
  three: boolean;
}

const knockoutGames = ({ n, three }: KnockoutParams) => (three ? (n - 1) / 2 : n - 1);

const cmKnockout: Generator<KnockoutParams> = {
  id: 'cm-knockout',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { event: rng.int(0, THREE_EVENTS.length - 1), n: 2 * rng.int(8, 75) + 1, three: true };
    return { event: rng.int(0, EVENTS.length - 1), n: rng.int(13, 150), three: false };
  },
  render(p) {
    const e = p.three ? THREE_EVENTS[p.event] : EVENTS[p.event];
    if (p.three) {
      return typed(
        [
          say(`${p.n} ${e.who} enter a ${e.event} where every ${e.game} has exactly three ${e.who} in it: its winner goes through and the other two are out. Anyone left over in a round goes straight through to the next.`),
          say(`How many ${e.games} are played to find the champion?`),
        ],
        knockoutGames(p),
        `\\text{${e.games}} =`,
      );
    }
    return typed(
      [
        say(`${p.n} ${e.who} enter a knockout ${e.event}. Every ${e.game} has a winner, the loser is out, and anyone left without an opponent in a round goes straight through to the next.`),
        say(`How many ${e.games} are played to find the champion?`),
      ],
      knockoutGames(p),
      `\\text{${e.games}} =`,
    );
  },
  choices(p) {
    const rounds = Math.ceil(Math.log2(p.n));
    if (p.three) return numberOptions(knockoutGames(p), [p.n - 1, (p.n + 1) / 2, Math.floor(p.n / 3)], 1, 1);
    return numberOptions(knockoutGames(p), [p.n, Math.floor(p.n / 2), rounds], 1, 1);
  },
  solution(p) {
    const e = p.three ? THREE_EVENTS[p.event] : EVENTS[p.event];
    if (p.three) {
      return [
        { text: `Count the ${e.who} knocked out, not the rounds. Every ${e.game} knocks out exactly two, and all but the champion go:` },
        { tex: `${p.n} - 1 = ${p.n - 1}` },
        { tex: `${p.n - 1} \\div 2 = ${knockoutGames(p)}` },
      ];
    }
    return [
      { text: `Count the ${e.who} knocked out, not the rounds. Every ${e.game} knocks out exactly one, and everyone but the champion is knocked out once:` },
      { tex: `${p.n} - 1 = ${p.n - 1}` },
      { text: 'The byes change how the rounds look, never this count.' },
    ];
  },
};

/* ---------- breaking a bar: each snap makes one more piece ---------- */

interface BreakParams {
  dims: Dims;
  /** Difficulty 2: a block of cheese cut into unit cubes. */
  solid: boolean;
}

const pieces = ({ dims: [a, b, c] }: BreakParams) => a * b * c;

const cmChocolate: Generator<BreakParams> = {
  id: 'cm-chocolate',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const a = rng.int(2, 4);
      const b = rng.int(a, 5);
      return { dims: [a, b, rng.int(b, 6)], solid: true };
    }
    const m = rng.int(2, 8);
    return { dims: [m, rng.int(m + 1, 12), 1], solid: false };
  },
  render(p) {
    const [a, b, c] = p.dims;
    if (p.solid) {
      return typed(
        [
          say(`A block of cheese measures $${dimsTex(p.dims)}$ and is to be cut into $${a * b * c}$ unit cubes. Each cut goes straight through one piece, and pieces may not be stacked.`),
          say('How many cuts does it take?'),
        ],
        pieces(p) - 1,
        '\\text{cuts} =',
      );
    }
    return typed(
      [
        say(`A chocolate bar is a $${a} \\times ${b}$ grid of squares. Each snap breaks one piece along a line into two pieces.`),
        say('How many snaps does it take to break it into single squares?'),
      ],
      pieces(p) - 1,
      '\\text{snaps} =',
    );
  },
  choices(p) {
    const [a, b, c] = p.dims;
    const answer = pieces(p) - 1;
    if (p.solid) return numberOptions(answer, [a - 1 + (b - 1) + (c - 1), a * b * c, (a - 1) * (b - 1) * (c - 1)], 1, 1);
    return numberOptions(answer, [a - 1 + (b - 1), (a - 1) * (b - 1), a * b], 1, 1);
  },
  solution(p) {
    const [a, b, c] = p.dims;
    const what = p.solid ? 'cut' : 'snap';
    return [
      { text: `Each ${what} turns one piece into two, so the number of pieces goes up by exactly one. The ${p.solid ? 'block' : 'bar'} ends in` },
      { tex: p.solid ? `${a} \\times ${b} \\times ${c} = ${a * b * c}` : `${a} \\times ${b} = ${a * b}` },
      { text: `pieces, starting from one, so it takes` },
      { tex: `${pieces(p)} - 1 = ${pieces(p) - 1}` },
    ];
  },
};

/* ---------- routes through a grid: words of R and U ---------- */

interface RouteParams {
  a: number;
  b: number;
  /** Difficulty 2: the route must pass through P, this many blocks across and up. */
  via?: [number, number];
}

const routes = ({ a, b, via }: RouteParams): number =>
  via ? choose(via[0] + via[1], via[0]) * choose(a - via[0] + (b - via[1]), a - via[0]) : choose(a + b, a);

const cmGridPaths: Generator<RouteParams> = {
  id: 'cm-grid-paths',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const a = rng.int(3, 7);
      const b = rng.int(2, 5);
      return { a, b, via: [rng.int(1, a - 1), rng.int(1, b - 1)] };
    }
    for (;;) {
      const a = rng.int(2, 8);
      const b = rng.int(2, 6);
      if (a + b <= 11) return { a, b };
    }
  },
  render(p) {
    return typed(
      [
        say(`A grid of streets is $${p.a}$ blocks across and $${p.b}$ blocks up. A route runs along the streets from $A$ to $B$, only ever going right or up.`),
        { kind: 'diagram', svg: gridSvg(p.a, p.b, true, p.via) },
        say(p.via ? 'How many of these routes pass through $P$?' : 'How many routes are there?'),
      ],
      routes(p),
      '\\text{routes} =',
    );
  },
  choices(p) {
    const { a, b, via } = p;
    if (via) {
      const first = choose(via[0] + via[1], via[0]);
      const second = choose(a - via[0] + (b - via[1]), a - via[0]);
      return numberOptions(routes(p), [choose(a + b, a), first + second, choose(a + b, a) - routes(p)], 1, 1);
    }
    return numberOptions(routes(p), [a * b, 2 ** (a + b), a + b], 1, 1);
  },
  solution(p) {
    const { a, b, via } = p;
    if (via) {
      const [c, d] = via;
      return [
        { text: `Split the route at $P$. From $A$ to $P$ is ${c} right and ${d} up, in any order:` },
        { tex: `${binom(c + d, c)} = ${choose(c + d, c)}` },
        { text: `From $P$ to $B$ is ${a - c} right and ${b - d} up:` },
        { tex: `${binom(a - c + b - d, a - c)} = ${choose(a - c + b - d, a - c)}` },
        { text: 'Every first half goes with every second half, so multiply:' },
        { tex: `${choose(c + d, c)} \\times ${choose(a - c + b - d, a - c)} = ${routes(p)}` },
      ];
    }
    return [
      { text: `Every route is ${a} moves right and ${b} up, so it is a word of ${a} R's and ${b} U's, and every such word is a route. Choose which ${a} of the ${a + b} moves are R:` },
      { tex: `${binom(a + b, a)} = ${routes(p)}` },
    ];
  },
};

/* ---------- the grid again, filled in corner by corner ---------- */

interface GridTableParams {
  a: number;
  b: number;
  /** Blank corners as [across, up], every one with both coordinates at least 1. */
  blanks: [number, number][];
}

const cmGridTable: Generator<GridTableParams> = {
  id: 'cm-grid-table',
  sample(rng, difficulty) {
    const [a, b] = difficulty >= 2 ? rng.pick([[4, 3], [4, 4], [3, 4]] as const) : rng.pick([[3, 2], [4, 2], [3, 3], [2, 3]] as const);
    const inner: [number, number][] = [];
    for (let j = 1; j <= b; j += 1) for (let i = 1; i <= a; i += 1) if (i !== a || j !== b) inner.push([i, j]);
    const want = difficulty >= 2 ? 4 : 3;
    for (;;) {
      const blanks: [number, number][] = [...rng.sample(inner, want - 1), [a, b]];
      const values = blanks.map(([i, j]) => choose(i + j, i));
      if (new Set(values).size < want) continue;
      // Reading order: top row first, left to right.
      blanks.sort((p, q) => q[1] - p[1] || p[0] - q[0]);
      return { a, b, blanks };
    }
  },
  render({ a, b, blanks }) {
    const isBlank = (i: number, j: number) => blanks.some(([x, y]) => x === i && y === j);
    const rows: (string | null)[][] = [];
    for (let j = b; j >= 0; j -= 1) {
      const row: (string | null)[] = [`y = ${j}`];
      for (let i = 0; i <= a; i += 1) row.push(isBlank(i, j) ? null : num(choose(i + j, i)));
      rows.push(row);
    }
    const answer = blanks.map(([i, j]) => choose(i + j, i));
    const slips = blanks.flatMap(([i, j]) => [choose(i + j, i) + 1, i * j, i + j + 1]);
    return {
      kind: 'table',
      prompt: [
        say('Each entry counts the routes from $A$ to a street corner, going only right or up. The corner $x$ blocks across and $y$ up is in row $y$, column $x$. Fill in the blanks.'),
        { kind: 'diagram', svg: gridSvg(a, b, true) },
      ],
      columns: ['', ...Array.from({ length: a + 1 }, (_, i) => `x = ${i}`)],
      rows,
      bank: numberBank(answer, slips, 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution({ blanks }) {
    const steps: SolutionStep[] = [{ text: 'A route into a corner arrives from the left or from below, so each entry is the one to its left plus the one below it:' }];
    const sorted = [...blanks].sort((p, q) => p[1] - q[1] || p[0] - q[0]);
    for (const [i, j] of sorted) {
      steps.push({ tex: `(${i}, ${j}){:}\\quad ${choose(i - 1 + j, i - 1)} + ${choose(i + j - 1, i)} = ${choose(i + j, i)}` });
    }
    return steps;
  },
};

/* ---------- sharing identical things: sweets and dividers ---------- */

const SHARES = [
  { things: 'identical sweets', people: 'children' },
  { things: 'identical marbles', people: 'boxes' },
  { things: 'identical stickers', people: 'friends' },
];

interface ShareParams {
  context: number;
  n: number;
  k: number;
  /** Difficulty 2: everyone gets at least one. */
  atLeastOne: boolean;
}

const shareWays = ({ n, k, atLeastOne }: ShareParams) => (atLeastOne ? choose(n - 1, k - 1) : choose(n + k - 1, k - 1));

const cmShareSweets: Generator<ShareParams> = {
  id: 'cm-share-sweets',
  sample(rng, difficulty) {
    const context = rng.int(0, SHARES.length - 1);
    if (difficulty >= 2) {
      const k = rng.pick([3, 4]);
      return { context, n: rng.int(k + 2, k === 3 ? 20 : 15), k, atLeastOne: true };
    }
    return { context, n: rng.int(4, 20), k: 3, atLeastOne: false };
  },
  render(p) {
    const s = SHARES[p.context];
    const who = s.people === 'boxes' ? 'box' : s.people === 'children' ? 'child' : 'friend';
    const rule = p.atLeastOne ? `Every ${who} gets at least one.` : `A ${who} may get none.`;
    return typed(
      [
        say(`${p.n} ${s.things} are shared between ${p.k} ${s.people}, all of them handed out. ${rule}`),
        say('In how many ways can this be done?'),
      ],
      shareWays(p),
      '\\text{ways} =',
    );
  },
  choices(p) {
    const { n, k } = p;
    if (p.atLeastOne) return numberOptions(shareWays(p), [choose(n + k - 1, k - 1), choose(n, k - 1), choose(n - 2, k - 1)], 1, 1);
    return numberOptions(shareWays(p), [choose(n - 1, 2), choose(n + 1, 2), (n + 1) * (n + 1)], 1, 1);
  },
  solution(p) {
    const { n, k } = p;
    const s = SHARES[p.context];
    const steps: SolutionStep[] = [];
    let rest = n;
    if (p.atLeastOne) {
      rest = n - k;
      steps.push({ text: `Hand one to each of the ${k} ${s.people} first. What is left is shared with no rule:` }, { tex: `${n} - ${k} = ${rest}` });
    }
    steps.push(
      { text: `Put the ${rest} in a row with ${k - 1} dividers among them: the first share is everything before the first divider, and so on. Every row of ${rest} things and ${k - 1} dividers is one way to share, so choose the ${k - 1} places for the dividers out of ${rest + k - 1}:` },
      { tex: `${binom(rest + k - 1, k - 1)} = ${shareWays(p)}` },
    );
    return steps;
  },
};

/* ================================================================
 * Lesson 2: Key Strategies
 * ================================================================ */

/* ---------- work backwards: undo each step, last first ---------- */

type Op = { kind: 'add' | 'sub' | 'mul' | 'div'; by: number };

const opWords = (op: Op) =>
  op.kind === 'add' ? `add $${op.by}$` : op.kind === 'sub' ? `take away $${op.by}$` : op.kind === 'mul' ? `multiply by $${op.by}$` : `divide by $${op.by}$`;

const apply = (x: number, op: Op) => (op.kind === 'add' ? x + op.by : op.kind === 'sub' ? x - op.by : op.kind === 'mul' ? x * op.by : x / op.by);

const undo = (x: number, op: Op) => (op.kind === 'add' ? x - op.by : op.kind === 'sub' ? x + op.by : op.kind === 'mul' ? x / op.by : x * op.by);

const undoTex = (x: number, op: Op) => {
  const sign = op.kind === 'add' ? '-' : op.kind === 'sub' ? '+' : op.kind === 'mul' ? '\\div' : '\\times';
  return `${num(x)} ${sign} ${op.by} = ${num(undo(x, op))}`;
};

interface BackParams {
  start: number;
  ops: Op[];
  /** Difficulty 2: a jar where half and then `more` are eaten each day, for `days` days. */
  jar?: { more: number; days: number; left: number };
}

/** The jar's contents at the start of each day, then what is left: [start, after day 1, …]. */
function jarTrail({ more, days, left }: { more: number; days: number; left: number }): number[] {
  const out = [left];
  for (let d = 0; d < days; d += 1) out.unshift(2 * (out[0] + more));
  return out;
}

/** Undoing half-then-more in the wrong order: double, then add. */
function wrongJar({ more, days, left }: { more: number; days: number; left: number }): number {
  let x = left;
  for (let d = 0; d < days; d += 1) x = 2 * x + more;
  return x;
}

const JAR_SETUP = (more: number) => `A jar of sweets is dipped into once a day: half of the sweets in it are eaten, and then $${more}$ more.`;

const cmWorkBackwards: Generator<BackParams> = {
  id: 'cm-work-backwards',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const jar = { more: rng.int(1, 5), days: rng.pick([3, 4]), left: rng.int(2, 9) };
      return { start: jarTrail(jar)[0], ops: [], jar };
    }
    for (;;) {
      const start = rng.int(3, 30);
      const ops: Op[] = [];
      let x = start;
      let ok = true;
      for (let i = 0; i < 4; i += 1) {
        const kind = rng.pick(['add', 'sub', 'mul', 'div'] as const);
        const by = kind === 'mul' ? rng.int(2, 5) : kind === 'div' ? rng.int(2, 4) : rng.int(2, 15);
        const next = apply(x, { kind, by });
        if (!Number.isInteger(next) || next <= 0 || next > 400) {
          ok = false;
          break;
        }
        if (ops.length > 0 && ops[ops.length - 1].kind === kind) {
          ok = false;
          break;
        }
        ops.push({ kind, by });
        x = next;
      }
      if (!ok || !ops.some((op) => op.kind === 'mul' || op.kind === 'div')) continue;
      if (!ops.some((op) => op.kind === 'add' || op.kind === 'sub')) continue;
      return { start, ops };
    }
  },
  render(p) {
    if (p.jar) {
      return typed(
        [say(JAR_SETUP(p.jar.more)), say(`After ${p.jar.days} days there are $${p.jar.left}$ sweets left. How many were in the jar at the start?`)],
        p.start,
        '\\text{sweets} =',
      );
    }
    const end = p.ops.reduce(apply, p.start);
    const words = p.ops.map(opWords);
    const said = `${words.slice(0, -1).join(', ')} and then ${words[words.length - 1]}`;
    return typed(
      [say(`I think of a number. I ${said}. The answer is $${end}$.`), say('What number did I think of?')],
      p.start,
      '\\text{number} =',
    );
  },
  choices(p) {
    if (p.jar) {
      const { more, days, left } = p.jar;
      return numberOptions(p.start, [wrongJar(p.jar), left * 2 ** days, 2 * (left + more) * days], 1, 1);
    }
    const end = p.ops.reduce(apply, p.start);
    // Undoing the steps first to last, and doing them again instead of undoing them.
    const inOrder = p.ops.reduce(undo, end);
    const forwards = p.ops.reduce(apply, end);
    return numberOptions(p.start, [inOrder, forwards, end], 1, 1);
  },
  solution(p) {
    if (p.jar) {
      const trail = jarTrail(p.jar);
      const steps: SolutionStep[] = [
        { text: `Work back from the end. Before the ${p.jar.more} more were eaten there were ${p.jar.more} more than were left, and that was half of what the day started with, so each day started with` },
      ];
      for (let d = p.jar.days; d >= 1; d -= 1) steps.push({ tex: `2 \\times (${trail[d]} + ${p.jar.more}) = ${trail[d - 1]}` });
      return steps;
    }
    const end = p.ops.reduce(apply, p.start);
    const steps: SolutionStep[] = [{ text: 'Undo the steps from the last back to the first, each with its opposite:' }];
    let x = end;
    for (const op of [...p.ops].reverse()) {
      steps.push({ tex: undoTex(x, op) });
      x = undo(x, op);
    }
    return steps;
  },
};

/* ---------- the jar, worked back as a table ---------- */

interface JarTableParams {
  more: number;
  days: number;
  left: number;
}

const cmBackwardsTable: Generator<JarTableParams> = {
  id: 'cm-backwards-table',
  sample(rng, difficulty) {
    return { more: rng.int(1, 5), days: difficulty >= 2 ? 4 : 3, left: rng.int(2, 12) };
  },
  render(p) {
    const trail = jarTrail(p);
    const rows: (string | null)[][] = trail.map((v, d) => [d === 0 ? '\\text{start}' : `\\text{after day ${d}}`, d === p.days ? num(v) : null]);
    const answer = trail.slice(0, -1);
    // Doubling before adding, and forgetting the extra sweets altogether.
    const slips = [wrongJar({ ...p, days: 1 }), wrongJar({ ...p, days: 2 }), 2 * p.left, 4 * p.left];
    return {
      kind: 'table',
      prompt: [say(JAR_SETUP(p.more)), say(`After ${p.days} days there are $${p.left}$ left. Work backwards to fill in the table.`)],
      columns: ['\\text{when}', '\\text{sweets}'],
      rows,
      bank: numberBank(answer, slips, 3, 1, 1),
      answer: answer.map(num),
    };
  },
  solution(p) {
    const trail = jarTrail(p);
    const steps: SolutionStep[] = [{ text: `Add back the ${p.more}, then double to undo the half:` }];
    for (let d = p.days; d >= 1; d -= 1) steps.push({ tex: `2 \\times (${trail[d]} + ${p.more}) = ${trail[d - 1]}` });
    return steps;
  },
};

/* ---------- draw it: places in a queue ---------- */

const QUEUE_NAMES: [string, string][] = [
  ['Sam', 'Ravi'],
  ['Ann', 'Ben'],
  ['Zoe', 'Kai'],
  ['Mei', 'Tom'],
];

interface QueueParams {
  names: number;
  front: number;
  back: number;
  /** Difficulty 2: two people, with this many between them. */
  between?: number;
}

const queueSize = (p: QueueParams) => (p.between === undefined ? p.front + p.back - 1 : p.front + p.between + p.back);

const cmQueue: Generator<QueueParams> = {
  id: 'cm-queue',
  sample(rng, difficulty) {
    const names = rng.int(0, QUEUE_NAMES.length - 1);
    if (difficulty >= 2) return { names, front: rng.int(3, 15), back: rng.int(3, 15), between: rng.int(2, 12) };
    return { names, front: rng.int(3, 25), back: rng.int(3, 25) };
  },
  render(p) {
    const [x, y] = QUEUE_NAMES[p.names];
    if (p.between !== undefined) {
      return typed(
        [
          say(`In a queue, ${x} is ${ordinal(p.front)} from the front and ${y} is ${ordinal(p.back)} from the back. ${x} is ahead of ${y}, with ${p.between} people between them.`),
          say('How many people are in the queue?'),
        ],
        queueSize(p),
        '\\text{people} =',
      );
    }
    return typed(
      [say(`In a queue, ${x} is ${ordinal(p.front)} from the front and ${ordinal(p.back)} from the back.`), say('How many people are in the queue?')],
      queueSize(p),
      '\\text{people} =',
    );
  },
  choices(p) {
    const n = queueSize(p);
    if (p.between !== undefined) return numberOptions(n, [n + 2, n - 1, n + 1], 1, 1);
    return numberOptions(n, [n + 1, n - 1, n + 2], 1, 1);
  },
  solution(p) {
    const [x, y] = QUEUE_NAMES[p.names];
    if (p.between !== undefined) {
      return [
        { text: `Draw it. From the front up to ${x} is ${p.front} people, including ${x}. Then come the ${p.between} between them. ${y} is ${ordinal(p.back)} from the back, so from ${y} to the end is ${p.back} people, including ${y}. Nobody is counted twice:` },
        { tex: `${p.front} + ${p.between} + ${p.back} = ${queueSize(p)}` },
      ];
    }
    return [
      { text: `Draw it. Counting ${p.front} from the front and ${p.back} from the back both end on ${x}, so ${x} is counted twice:` },
      { tex: `${p.front} + ${p.back} - 1 = ${queueSize(p)}` },
    ];
  },
};

/* ---------- draw the last day: the snail in the well ---------- */

const CLIMBERS = [
  { who: 'A snail', what: 'the bottom of a well', height: 'deep' },
  { who: 'A frog', what: 'the bottom of a well', height: 'deep' },
  { who: 'A beetle', what: 'the foot of a pole', height: 'tall' },
];

interface SnailParams {
  climber: number;
  depth: number;
  up: number;
  down: number;
}

/** Full days and nights needed to reach within `up` of the top. */
const nightsBefore = ({ depth, up, down }: SnailParams) => Math.ceil((depth - up) / (up - down));

const snailDay = (p: SnailParams) => nightsBefore(p) + 1;

const cmSnail: Generator<SnailParams> = {
  id: 'cm-snail',
  sample(rng, difficulty) {
    const climber = rng.int(0, CLIMBERS.length - 1);
    for (;;) {
      const up = difficulty >= 2 ? rng.int(5, 12) : rng.int(3, 6);
      const down = rng.int(1, up - 1);
      const depth = difficulty >= 2 ? rng.int(20, 80) : rng.int(10, 30);
      const p = { climber, depth, up, down };
      if (depth <= up + (up - down)) continue;
      // The naive depth ÷ net climb must be a wrong answer.
      if (Math.ceil(depth / (up - down)) === snailDay(p)) continue;
      return p;
    }
  },
  render(p) {
    const c = CLIMBERS[p.climber];
    return typed(
      [
        say(`${c.who} is at ${c.what} $${p.depth}$ m ${c.height}. Each day it climbs $${p.up}$ m, and each night it slips back $${p.down}$ m.`),
        say('On which day does it reach the top?'),
      ],
      snailDay(p),
      '\\text{day} =',
    );
  },
  choices(p) {
    const net = p.up - p.down;
    return numberOptions(snailDay(p), [Math.ceil(p.depth / net), Math.floor(p.depth / net), nightsBefore(p)], 1, 1);
  },
  solution(p) {
    const net = p.up - p.down;
    const k = nightsBefore(p);
    return [
      { text: `Draw the last day: once it is within ${p.up} m of the top, it climbs out that day and never slips back. So it first has to reach` },
      { tex: `${p.depth} - ${p.up} = ${p.depth - p.up}` },
      { text: `metres up, gaining ${net} m for each day and night. After ${k - 1} of them it is only at ${(k - 1) * net} m; after ${k} it is at` },
      { tex: `${k} \\times ${net} = ${k * net}` },
      { text: `So it climbs out on the next day, day ${k + 1}.` },
    ];
  },
};

/* ---------- small cases: squares and rectangles in a grid ---------- */

interface CountParams {
  m: number;
  n: number;
  /** Difficulty 2: every rectangle, not just the squares. */
  rectangles: boolean;
}

const squaresIn = (m: number, n: number) => {
  let total = 0;
  for (let k = 1; k <= Math.min(m, n); k += 1) total += (m - k + 1) * (n - k + 1);
  return total;
};

const rectanglesIn = (m: number, n: number) => choose(m + 1, 2) * choose(n + 1, 2);

const cmCountSquares: Generator<CountParams> = {
  id: 'cm-count-squares',
  sample(rng, difficulty) {
    const m = rng.int(2, difficulty >= 2 ? 5 : 6);
    return { m, n: rng.int(m, 9), rectangles: difficulty >= 2 };
  },
  render({ m, n, rectangles }) {
    return typed(
      [
        say(`A grid is $${m}$ unit squares high and $${n}$ wide.`),
        { kind: 'diagram', svg: gridSvg(n, m, false) },
        say(rectangles ? 'How many rectangles of any size, squares included, are drawn in it?' : 'How many squares of any size are drawn in it?'),
      ],
      rectangles ? rectanglesIn(m, n) : squaresIn(m, n),
      rectangles ? '\\text{rectangles} =' : '\\text{squares} =',
    );
  },
  choices({ m, n, rectangles }) {
    if (rectangles) return numberOptions(rectanglesIn(m, n), [squaresIn(m, n), m * n, (m + 1) * (n + 1)], 1, 1);
    let sumSq = 0;
    for (let k = 1; k <= m; k += 1) sumSq += k * k;
    return numberOptions(squaresIn(m, n), [m * n, sumSq, m * n + (m - 1) * (n - 1)], 1, 1);
  },
  solution({ m, n, rectangles }) {
    if (rectangles) {
      return [
        { text: `A rectangle is fixed by its top and bottom sides and its left and right sides: 2 of the ${m + 1} lines across and 2 of the ${n + 1} lines up and down.` },
        { tex: `${binom(m + 1, 2)} \\times ${binom(n + 1, 2)}` },
        { tex: `= ${choose(m + 1, 2)} \\times ${choose(n + 1, 2)} = ${rectanglesIn(m, n)}` },
      ];
    }
    const steps: SolutionStep[] = [{ text: `Count by size, starting small. A square of side $k$ has $${m + 1} - k$ places going up and $${n + 1} - k$ going across:` }];
    const terms: number[] = [];
    for (let k = 1; k <= m; k += 1) {
      const t = (m - k + 1) * (n - k + 1);
      terms.push(t);
      steps.push({ tex: `${k} \\times ${k}{:}\\quad ${m - k + 1} \\times ${n - k + 1} = ${t}` });
    }
    steps.push({ tex: `${terms.join(' + ')} = ${squaresIn(m, n)}` });
    return steps;
  },
};

/* ================================================================
 * Lesson 3: Color Cube Assembly
 * ================================================================ */

const COLOURS = [
  ['red', 'white'],
  ['blue', 'yellow'],
  ['black', 'white'],
  ['green', 'grey'],
];

/* ---------- the least cubes to make the outside one colour ---------- */

interface ShellParams {
  dims: Dims;
  colour: number;
}

const shell = (dims: Dims) => dims[0] * dims[1] * dims[2] - roles(dims).hidden;

function sampleShell(rng: { int(a: number, b: number): number }, difficulty: number): ShellParams {
  const colour = rng.int(0, COLOURS.length - 1);
  if (difficulty >= 2) {
    for (;;) {
      const a = rng.int(3, 5);
      const b = rng.int(a, 6);
      const c = rng.int(b, 7);
      if (isCube([a, b, c])) continue;
      return { dims: [a, b, c], colour };
    }
  }
  const k = rng.int(3, 10);
  return { dims: [k, k, k], colour };
}

function shellSetup({ dims, colour }: ShellParams): string {
  const [on, off] = COLOURS[colour];
  const size = isCube(dims) ? `A cube of edge $${dims[0]}$` : `A $${dimsTex(dims)}$ block`;
  return `${size} is to be built from unit cubes, each ${on} all over or ${off} all over.`;
}

const cmCubeShell: Generator<ShellParams> = {
  id: 'cm-cube-shell',
  sample: sampleShell,
  render(p) {
    const [on] = COLOURS[p.colour];
    return typed(
      [say(shellSetup(p)), { kind: 'diagram', svg: blockSvg(p.dims) }, say(`What is the least number of ${on} cubes needed to make the whole outside ${on}?`)],
      shell(p.dims),
      '\\text{cubes} =',
    );
  },
  choices({ dims }) {
    const [a, b, c] = dims;
    const squares = 2 * (a * b + b * c + a * c);
    return numberOptions(shell(dims), [squares, roles(dims).hidden, a * b * c - (a - 1) * (b - 1) * (c - 1)], 1, 1);
  },
  solution({ dims }) {
    const [a, b, c] = dims;
    const { hidden } = roles(dims);
    return [
      { text: 'Only the hidden cubes can be the other colour. They make a core one layer in from every face, so 2 shorter each way:' },
      { tex: isCube(dims) ? `${a - 2}^3 = ${hidden}` : `${a - 2} \\times ${b - 2} \\times ${c - 2} = ${hidden}` },
      { text: 'Every other cube shows at least one face:' },
      { tex: `${a * b * c} - ${hidden} = ${shell(dims)}` },
    ];
  },
};

/* ---------- the same count as tiles: all, core, outside ---------- */

const cmShellTiles: Generator<ShellParams> = {
  id: 'cm-shell-tiles',
  sample: sampleShell,
  render(p) {
    const [a, b, c] = p.dims;
    const [on] = COLOURS[p.colour];
    const all = a * b * c;
    const { hidden } = roles(p.dims);
    return {
      kind: 'tiles',
      prompt: [say(shellSetup(p)), say(`Fill in the number of unit cubes in all, how many are hidden inside, and the least number of ${on} cubes that makes the outside ${on}.`)],
      template: '\\text{all} = {0}, \\quad \\text{hidden} = {1}, \\quad \\text{least} = {2}',
      bank: numberBank([all, hidden, shell(p.dims)], [2 * (a * b + b * c + a * c), (a - 1) * (b - 1) * (c - 1), all - (a - 1) * (b - 1) * (c - 1)], 3, 1, 1),
      answer: [num(all), num(hidden), num(shell(p.dims))],
    };
  },
  solution(p) {
    const [a, b, c] = p.dims;
    const { hidden } = roles(p.dims);
    return [
      { tex: `\\text{all} = ${a} \\times ${b} \\times ${c} = ${a * b * c}` },
      { text: 'The hidden cubes are a core 2 shorter each way:' },
      { tex: `\\text{hidden} = ${a - 2} \\times ${b - 2} \\times ${c - 2} = ${hidden}` },
      { text: 'Everything else shows on the outside:' },
      { tex: `${a * b * c} - ${hidden} = ${shell(p.dims)}` },
    ];
  },
};

/* ---------- a block of dice: the pips that show ---------- */

interface DiceParams {
  dims: Dims;
  /** Difficulty 2: the largest total rather than the smallest. */
  most: boolean;
}

/** Pips showing on a corner, an edge and a face die, at their least or most. */
const pipEach = (most: boolean) => (most ? { corner: 15, edge: 11, face: 6 } : { corner: 6, edge: 3, face: 1 });

function pipTotal({ dims, most }: DiceParams): number {
  const r = roles(dims);
  const e = pipEach(most);
  return r.corners * e.corner + r.edges * e.edge + r.faces * e.face;
}

const cmDiceCube: Generator<DiceParams> = {
  id: 'cm-dice-cube',
  sample(rng, difficulty) {
    const a = rng.int(2, 5);
    const b = rng.int(a, 6);
    return { dims: [a, b, rng.int(b, 6)], most: difficulty >= 2 };
  },
  render(p) {
    const size = isCube(p.dims) ? `cube of edge $${p.dims[0]}$` : `$${dimsTex(p.dims)}$ block`;
    return typed(
      [
        say(`A ${size} is glued together from ordinary dice, whose opposite faces add up to $7$. Each die can be turned any way before it goes in.`),
        say(`What is the ${p.most ? 'largest' : 'smallest'} possible total of the pips showing on all six faces of the ${isCube(p.dims) ? 'cube' : 'block'}?`),
      ],
      pipTotal(p),
      '\\text{total} =',
    );
  },
  choices(p) {
    const [a, b, c] = p.dims;
    const squares = 2 * (a * b + b * c + a * c);
    const r = roles(p.dims);
    // Every square at its best, edges as if two of the same face could show, and 3.5 a square on average.
    if (p.most) return numberOptions(pipTotal(p), [6 * squares, 15 * r.corners + 12 * r.edges + 6 * r.faces, (7 * squares) / 2], 1, 1);
    return numberOptions(pipTotal(p), [squares, 6 * r.corners + 2 * r.edges + r.faces, (7 * squares) / 2], 1, 1);
  },
  solution(p) {
    const r = roles(p.dims);
    const e = pipEach(p.most);
    const [a, b, c] = p.dims;
    const steps: SolutionStep[] = [
      {
        text: p.most
          ? 'A corner die shows three faces that meet at a corner, so no two are opposite: at most $4$, $5$ and $6$, making $15$. An edge die shows two neighbouring faces, at most $5$ and $6$, making $11$, and a face die shows one, at most $6$. Each die turns freely, so all of these can happen at once.'
          : 'A corner die shows three faces that meet at a corner, so no two are opposite: at least $1$, $2$ and $3$, making $6$. An edge die shows two neighbouring faces, at least $1$ and $2$, making $3$, and a face die shows one, at least $1$. Each die turns freely, so all of these can happen at once.',
      },
      { text: 'Count the dice by where they sit:' },
      { tex: `\\text{edges}{:}\\quad 4 \\times (${a - 2} + ${b - 2} + ${c - 2}) = ${r.edges}` },
      { tex: `\\text{faces}{:}\\quad 2 \\times (${(a - 2) * (b - 2)} + ${(b - 2) * (c - 2)} + ${(a - 2) * (c - 2)}) = ${r.faces}` },
      { tex: `8 \\times ${e.corner} + ${r.edges} \\times ${e.edge} + ${r.faces} \\times ${e.face} = ${pipTotal(p)}` },
    ];
    return steps;
  },
};

/* ---------- a few red cubes: as much or as little red as possible ---------- */

interface RedParams {
  k: number;
  red: number;
  /** Difficulty 2: as little red showing as possible. */
  least: boolean;
}

/** Red squares showing when the red cubes fill the places in this order of faces shown. */
function redShowing({ k, red, least }: RedParams): { counts: number[]; shows: number[]; total: number } {
  const r = roles([k, k, k]);
  const places = least
    ? [
        [r.hidden, 0],
        [r.faces, 1],
        [r.edges, 2],
        [8, 3],
      ]
    : [
        [8, 3],
        [r.edges, 2],
        [r.faces, 1],
        [r.hidden, 0],
      ];
  let rest = red;
  const counts: number[] = [];
  const shows: number[] = [];
  let total = 0;
  for (const [room, each] of places) {
    const take = Math.min(room, rest);
    rest -= take;
    if (take > 0) {
      counts.push(take);
      shows.push(each);
      total += take * each;
    }
  }
  return { counts, shows, total };
}

const cmRedSurface: Generator<RedParams> = {
  id: 'cm-red-surface',
  sample(rng, difficulty) {
    const k = rng.pick([3, 4]);
    const r = roles([k, k, k]);
    if (difficulty >= 2) return { k, red: rng.int(r.hidden + 2, k ** 3 - 9), least: true };
    return { k, red: rng.int(9, 8 + r.edges + r.faces - 1), least: false };
  },
  render(p) {
    const all = p.k ** 3;
    return typed(
      [
        say(`A cube of edge $${p.k}$ is built from $${all}$ unit cubes: $${p.red}$ red and the rest white. They are placed so that ${p.least ? 'as little' : 'as much'} of the outside as possible is red.`),
        say(`How many of the $${6 * p.k * p.k}$ unit squares on the outside are red?`),
      ],
      redShowing(p).total,
      '\\text{red squares} =',
    );
  },
  choices(p) {
    const answer = redShowing(p).total;
    const r = roles([p.k, p.k, p.k]);
    if (p.least) return numberOptions(answer, [p.red, p.red - r.hidden, 0, Math.round((p.red * 6) / p.k)], 1, 0);
    return numberOptions(answer, [3 * p.red, p.red, Math.round((p.red * 6) / p.k)], 1, 1);
  },
  solution(p) {
    const { counts, shows, total } = redShowing(p);
    const r = roles([p.k, p.k, p.k]);
    const text = p.least
      ? `Hide the red cubes. The ${r.hidden} hidden ${r.hidden === 1 ? 'place shows' : 'places show'} nothing, then the ${r.faces} face middles show one square each, then the ${r.edges} edges two, then the corners three.`
      : `Put the red cubes where the most shows: the 8 corners show three squares each, then the ${r.edges} edge places two, then the ${r.faces} face middles one.`;
    return [
      { text },
      { text: 'Fill the places in that order:' },
      { tex: `${counts.map((c, i) => `${c} \\times ${shows[i]}`).join(' + ')} = ${total}` },
    ];
  },
};

/* ================================================================
 * Lesson 4: Autobiographical Numbers
 * ================================================================ */

/* ---------- look and say ---------- */

/** Runs of equal digits: `3113` → [[1, '3'], [2, '1'], [1, '3']]. */
function runsOf(term: string): [number, string][] {
  const out: [number, string][] = [];
  for (const ch of term) {
    const last = out[out.length - 1];
    if (last && last[1] === ch) last[0] += 1;
    else out.push([1, ch]);
  }
  return out;
}

const lookSay = (term: string) =>
  runsOf(term)
    .map(([n, d]) => `${n}${d}`)
    .join('');

/** The description with digit and count swapped: `3113` → `31 12 31`. */
const saySwapped = (term: string) =>
  runsOf(term)
    .map(([n, d]) => `${d}${n}`)
    .join('');

/** Counting every copy of a digit at once rather than each run, in order of first appearance. */
function sayOverall(term: string): string {
  const order: string[] = [];
  for (const ch of term) if (!order.includes(ch)) order.push(ch);
  return order.map((d) => `${term.split('').filter((c) => c === d).length}${d}`).join('');
}

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/** A run said aloud: `one $3$`, `two $1$s`. */
const runWords = (runs: [number, string][]) => runs.map(([n, d]) => `${NUMBER_WORDS[n]} $${d}$${n === 1 ? '' : 's'}`).join(', ');

/** Reading a description backwards, pair by pair as count then digit. */
function unsay(term: string): string {
  let out = '';
  for (let i = 0; i < term.length; i += 2) out += term[i + 1].repeat(Number(term[i]));
  return out;
}

/** Reading the pairs the wrong way round, digit then count. */
function unsaySwapped(term: string): string {
  let out = '';
  for (let i = 0; i < term.length; i += 2) out += term[i].repeat(Number(term[i + 1]));
  return out;
}

function randomTerm(rng: { int(a: number, b: number): number }, runs: number): string {
  let out = '';
  let last = '';
  for (let r = 0; r < runs; r += 1) {
    let d = '';
    do d = String(rng.int(1, 3));
    while (d === last);
    out += d.repeat(rng.int(1, 3));
    last = d;
  }
  return out;
}

interface LookSayParams {
  /** The term shown. */
  term: string;
  /** Difficulty 2: find the term before rather than the one after. */
  back: boolean;
}

/** Four digit-string options: the answer and the first three distinct slips. */
function stringOptions(correct: string, slips: string[]): ChoiceOption[] {
  const seen = new Set([correct]);
  const picked: string[] = [];
  for (const s of slips) {
    if (picked.length === 3) break;
    if (!s || seen.has(s) || s.length > 15) continue;
    seen.add(s);
    picked.push(s);
  }
  return options({ tex: correct, answer: correct }, ...picked.map((s) => ({ tex: s, answer: s })));
}

const lookSaySlips = ({ term, back }: LookSayParams): string[] =>
  back ? [unsaySwapped(term), lookSay(term), runDigits(term), term] : [saySwapped(term), sayOverall(term), sayEach(term), term];

/** Every digit said on its own, runs ignored: `3233` → `13 12 13 13`. */
const sayEach = (term: string) =>
  term
    .split('')
    .map((d) => `1${d}`)
    .join('');

/** Reading the pairs but writing each digit once, counts ignored: `231122` → `312`. */
function runDigits(term: string): string {
  let out = '';
  for (let i = 0; i < term.length; i += 2) out += term[i + 1];
  return out;
}

const cmLookSay: Generator<LookSayParams> = {
  id: 'cm-look-say',
  sample(rng, difficulty) {
    for (;;) {
      // A typed answer is graded by value to a relative 1e-8, so it stays at
      // seven digits or fewer: one digit wrong in a longer one would pass.
      if (difficulty >= 2) {
        const before = randomTerm(rng, rng.int(3, 4));
        if (before.length > 7) continue;
        const term = lookSay(before);
        const p = { term, back: true };
        if (new Set(lookSaySlips(p).filter((s) => s !== before)).size < 3) continue;
        return p;
      }
      const term = randomTerm(rng, 3);
      const p = { term, back: false };
      if (new Set(lookSaySlips(p).filter((s) => s !== lookSay(term))).size < 3) continue;
      return p;
    }
  },
  render({ term, back }) {
    const rule = 'In a look-and-say sequence each term describes the one before: read it aloud in runs of equal digits, such as “one 3, two 1s, one 3”, and write down what you said.';
    if (back) {
      return typed([say(rule), show(term), say('This is a term of such a sequence. What was the term before it?')], unsay(term), '\\text{before} =');
    }
    return typed([say(rule), show(term), say('What is the next term?')], lookSay(term), '\\text{next} =');
  },
  choices(p) {
    return stringOptions(p.back ? unsay(p.term) : lookSay(p.term), lookSaySlips(p));
  },
  solution({ term, back }) {
    if (back) {
      const pairs: string[] = [];
      for (let i = 0; i < term.length; i += 2) pairs.push(term.slice(i, i + 2));
      const words = runWords(pairs.map((pr) => [Number(pr[0]), pr[1]] as [number, string]));
      return [
        { text: 'Read the term in pairs, each a count and then a digit:' },
        { tex: pairs.join(' \\; ') },
        { text: `So the term before was ${words}, written out:` },
        { tex: unsay(term) },
      ];
    }
    const runs = runsOf(term);
    return [
      { text: 'Split the term into runs of equal digits:' },
      { tex: runs.map(([n, d]) => d.repeat(n)).join(' \\; ') },
      { text: `Say each run as a count and then the digit: ${runWords(runs)}.` },
      { tex: lookSay(term) },
    ];
  },
};

/* ---------- look and say, several terms as a table ---------- */

interface LookTableParams {
  start: string;
  steps: number;
}

const lookTrail = ({ start, steps }: LookTableParams) => {
  const out = [start];
  for (let i = 0; i < steps; i += 1) out.push(lookSay(out[i]));
  return out;
};

/** Three wrong terms for the bank: runs said digit first, or every copy of a digit counted at once. */
function lookSpares(p: LookTableParams): string[] {
  const trail = lookTrail(p);
  const taken = new Set(trail);
  const spares: string[] = [];
  for (const s of trail.slice(0, -1).flatMap((t) => [saySwapped(t), sayOverall(t)])) {
    if (spares.length === 3) break;
    if (taken.has(s)) continue;
    taken.add(s);
    spares.push(s);
  }
  return spares;
}

const cmLookSayTable: Generator<LookTableParams> = {
  id: 'cm-look-say-table',
  sample(rng, difficulty) {
    const steps = difficulty >= 2 ? 4 : 3;
    for (;;) {
      const start = rng.int(1, 3) === 1 ? String(rng.int(1, 9)) : `${rng.int(1, 9)}${rng.int(1, 9)}`;
      const trail = lookTrail({ start, steps });
      if (new Set(trail).size < trail.length || trail[steps].length > 12) continue;
      if (lookSpares({ start, steps }).length < 3) continue;
      return { start, steps };
    }
  },
  render(p) {
    const trail = lookTrail(p);
    const answer = trail.slice(1);
    const spares = lookSpares(p);
    const bank = [...answer, ...spares].sort((x, y) => x.length - y.length || x.localeCompare(y));
    return {
      kind: 'table',
      prompt: [say('Each term of a look-and-say sequence reads the one before aloud, run by run. Fill in the terms that follow this start.')],
      columns: ['n', '\\text{term}'],
      rows: trail.map((t, i) => [`${i + 1}`, i === 0 ? t : null]),
      bank,
      answer,
    };
  },
  solution(p) {
    const trail = lookTrail(p);
    const steps: SolutionStep[] = [];
    for (let i = 1; i < trail.length; i += 1) {
      const runs = runsOf(trail[i - 1]);
      steps.push({ text: `$${trail[i - 1]}$ is ${runWords(runs)}:` }, { tex: trail[i] });
    }
    return steps;
  },
};

/* ---------- numbers whose digits count their own digits ---------- */

/** Digit i is how many times i appears, for every place. */
function describesItself(s: string): boolean {
  for (let i = 0; i < s.length; i += 1) {
    const count = s.split('').filter((c) => c === String(i)).length;
    if (Number(s[i]) !== count) return false;
  }
  return true;
}

const SELF_SHORT = ['1210', '2020', '21200'];
const SELF_LONG = ['3211000', '42101000', '521001000', '6210001000'];

/** Every number one step from `s`: one unit moved from one digit to another. */
function nearMisses(s: string): string[] {
  const d = s.split('').map(Number);
  const out: string[] = [];
  for (let i = 0; i < d.length; i += 1) {
    for (let j = 0; j < d.length; j += 1) {
      if (i === j || d[i] === 0 || d[j] === 9) continue;
      const e = [...d];
      e[i] -= 1;
      e[j] += 1;
      if (e[0] === 0) continue;
      const t = e.join('');
      if (!describesItself(t) && !out.includes(t)) out.push(t);
    }
  }
  return out;
}

interface SelfParams {
  correct: string;
  others: string[];
}

/** Where a number first fails to describe itself: the place, what it says, and the true count. */
function firstFailure(s: string): { place: number; says: number; has: number } {
  for (let i = 0; i < s.length; i += 1) {
    const has = s.split('').filter((c) => c === String(i)).length;
    if (Number(s[i]) !== has) return { place: i, says: Number(s[i]), has };
  }
  return { place: -1, says: 0, has: 0 };
}

const digitWord = (n: number) => (n === 1 ? 'digit' : 'digits');

const cmSelfDescribing: Generator<SelfParams> = {
  id: 'cm-self-describing',
  sample(rng, difficulty) {
    const correct = rng.pick(difficulty >= 2 ? SELF_LONG : SELF_SHORT);
    return { correct, others: rng.sample(nearMisses(correct), 3) };
  },
  render({ correct, others }): Slide {
    return choiceSlide(
      [
        say('A number **describes itself** when its first digit is how many 0s it has, its second digit how many 1s, its third how many 2s, and so on to its last digit.'),
        say('Which of these describes itself?'),
      ],
      correct,
      others,
    );
  },
  solution({ correct, others }) {
    const steps: SolutionStep[] = [{ text: 'Each has digits adding up to its length, so check every place:' }];
    for (const o of others) {
      const f = firstFailure(o);
      steps.push({ text: `$${o}$ says it has $${f.says}$ ${digitWord(f.says)} equal to $${f.place}$, but it has $${f.has}$.` });
    }
    const counts = correct.split('').map((_, i) => `${i}{:}\\ ${correct[i]}`);
    steps.push({ text: `$${correct}$ is right in every place: the count of each digit is` }, { tex: counts.join(' \\qquad ') });
    return steps;
  },
};

/* ---------- digit sums until one digit is left ---------- */

interface RootParams {
  /** Difficulty 1: the digit repeated `n` times. */
  digit: number;
  n: number;
  /** Difficulty 2: the numbers 1 to n written in a row. */
  row: boolean;
}

const rootOf = ({ digit, n, row }: RootParams) => digitalRoot(row ? (n * (n + 1)) / 2 : digit * n);

const cmDigitalRoot: Generator<RootParams> = {
  id: 'cm-digital-root',
  sample(rng, difficulty) {
    if (difficulty >= 2) return { digit: 0, n: rng.int(10, 99), row: true };
    return { digit: rng.int(2, 9), n: rng.int(10, 40), row: false };
  },
  render(p) {
    const number = p.row ? `123456789101112\\cdots${p.n}` : `\\underbrace{${p.digit}${p.digit}${p.digit}\\cdots${p.digit}}_{${p.n} \\text{ digits}}`;
    const what = p.row ? `The numbers $1$ to $${p.n}$ are written in a row to make one long number.` : `This number is the digit $${p.digit}$ written $${p.n}$ times.`;
    return typed(
      [say(what), show(number), say('Add up its digits, then add the digits of the result, and keep going until one digit is left. What is it?')],
      rootOf(p),
      '\\text{digit} =',
    );
  },
  choices(p) {
    const correct = rootOf(p);
    const slips = p.row ? [digitalRoot(p.n), digitalRoot(p.n * (p.n + 1)), digitalRoot(p.n + 1)] : [p.digit, digitalRoot(p.n), digitalRoot(p.digit + p.n)];
    const picked: number[] = [];
    for (const v of [...slips, ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => ((correct + d * 4 - 1) % 9) + 1)]) {
      if (picked.length === 3) break;
      if (v === correct || picked.includes(v)) continue;
      picked.push(v);
    }
    return options({ tex: num(correct), answer: num(correct) }, ...picked.sort((x, y) => x - y).map((v) => ({ tex: num(v), answer: num(v) })));
  },
  solution(p) {
    const total = p.row ? (p.n * (p.n + 1)) / 2 : p.digit * p.n;
    const r = total % 9;
    const steps: SolutionStep[] = [{ text: 'A number and its digit sum leave the same remainder when divided by 9, so every step keeps that remainder, and the last digit is it (or 9 for a remainder of 0).' }];
    if (p.row) {
      steps.push({ text: `The long number's digits are the digits of 1, 2, … , ${p.n}, and each of those leaves the same remainder as the number itself. So use their sum:` }, { tex: `1 + 2 + \\cdots + ${p.n} = \\frac{${p.n} \\times ${p.n + 1}}{2} = ${total}` });
    } else {
      steps.push({ text: 'The first digit sum is' }, { tex: `${p.digit} \\times ${p.n} = ${total}` });
    }
    steps.push({ tex: `${total} = 9 \\times ${(total - r) / 9} + ${r}` }, { text: r === 0 ? 'The remainder is 0, so the last digit is 9.' : `The last digit is ${r}.` });
    return steps;
  },
};

/* ---------- a number plus its digit sum ---------- */

interface PlusDigitsParams {
  n: number;
}

const plusDigits = (n: number) => n + digitSum(n);

/** Every number whose sum with its digit sum is `m`. */
function makers(m: number): number[] {
  const out: number[] = [];
  for (let x = Math.max(1, m - 50); x < m; x += 1) if (plusDigits(x) === m) out.push(x);
  return out;
}

/** Hundreds (or tens) digits whose remainder is in range, and the next digits that leave an even, small enough rest. */
function candidates(m: number, threeDigit: boolean) {
  if (!threeDigit) {
    const as = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((a) => m - 11 * a >= 0 && m - 11 * a <= 18);
    return { as, good: as.filter((a) => (m - 11 * a) % 2 === 0) };
  }
  const as = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((a) => m - 101 * a >= 0 && m - 101 * a <= 117);
  return { as, good: as };
}

const cmNumberPlusDigits: Generator<PlusDigitsParams> = {
  id: 'cm-number-plus-digits',
  sample(rng, difficulty) {
    for (;;) {
      const three = difficulty >= 2;
      const n = three ? rng.int(100, 999) : rng.int(10, 99);
      const m = plusDigits(n);
      if (makers(m).length !== 1) continue;
      const { as, good } = candidates(m, three);
      if (three) {
        if (as.length !== 1) continue;
        const rest = m - 101 * as[0];
        const bs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((b) => rest - 11 * b >= 0 && rest - 11 * b <= 18 && (rest - 11 * b) % 2 === 0);
        if (bs.length !== 1) continue;
      } else if (good.length !== 1) continue;
      return { n };
    }
  },
  render({ n }) {
    return typed([say(`A whole number plus the sum of its digits makes $${plusDigits(n)}$.`), say('What is the number?')], n, '\\text{number} =');
  },
  choices({ n }) {
    const m = plusDigits(n);
    return numberOptions(n, [m - digitSum(m), n + 9, n - 9, Math.floor(m / 2)], 1, 1);
  },
  solution({ n }) {
    const m = plusDigits(n);
    if (n >= 100) {
      const [a, b, c] = String(n).split('').map(Number);
      const rest = m - 101 * a;
      return [
        { text: 'Name the digits: the number is $100a + 10b + c$, and adding the digits gives' },
        { tex: `101a + 11b + 2c = ${m}` },
        { text: `$11b + 2c$ is at most $117$, and only $a = ${a}$ leaves that little:` },
        { tex: `11b + 2c = ${m} - ${101 * a} = ${rest}` },
        { text: `$2c$ is even and at most $18$, and only $b = ${b}$ leaves that:` },
        { tex: `2c = ${rest} - ${11 * b} = ${2 * c}` },
        { text: `So $c = ${c}$, and the number is ${n}. Check:` },
        { tex: `${n} + ${a} + ${b} + ${c} = ${m}` },
      ];
    }
    const [a, b] = String(n).split('').map(Number);
    const { as } = candidates(m, false);
    const other = as.filter((x) => x !== a);
    return [
      { text: 'Name the digits: the number is $10a + b$, and adding the digits gives' },
      { tex: `11a + 2b = ${m}` },
      {
        text:
          other.length > 0
            ? `$2b$ is even and at most $18$. $a = ${other[0]}$ leaves $${m - 11 * other[0]}$, which is odd, so $a = ${a}$:`
            : `$2b$ is even and at most $18$, and only $a = ${a}$ leaves that:`,
      },
      { tex: `2b = ${m} - ${11 * a} = ${2 * b}` },
      { text: `So $b = ${b}$, and the number is ${n}. Check:` },
      { tex: `${n} + ${a} + ${b} = ${m}` },
    ];
  },
};

export const contestReframingGenerators = [
  cmKnockout,
  cmChocolate,
  cmGridPaths,
  cmGridTable,
  cmShareSweets,
  cmWorkBackwards,
  cmBackwardsTable,
  cmQueue,
  cmSnail,
  cmCountSquares,
  cmCubeShell,
  cmShellTiles,
  cmDiceCube,
  cmRedSurface,
  cmLookSay,
  cmLookSayTable,
  cmSelfDescribing,
  cmDigitalRoot,
  cmNumberPlusDigits,
];
