/**
 * Contest Math, level 23: Contest Problem Strategies.
 *
 * The last level, and the one about how to start rather than what to know.
 * Six lessons, one per habit a contest rewards: split into cases, look at the
 * worst case or at what never changes, work out small cases until a pattern
 * shows, use a symmetry, let the answer options do the work, and simplify
 * before calculating. Each question mixes in a topic from an earlier level
 * (triangles, counting, remainders, powers) but is opened by the strategy.
 *
 * Shared helpers are in `contestMath.ts`.
 */
import type { ChoiceOption, Generator, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { choiceSlide } from './numberProof';
import { FRACTION_KEYS, fracAnswer, fracTex, gcd, num, numberBank, numberOptions, say, show, typed } from './contestMath';
import { options } from '../choiceVariant';

/* ================================================================
 * Shared pieces
 * ================================================================ */

type Frac = [number, number];

/**
 * Four fraction options: the answer and the first three distinct slips,
 * topped up with neighbours. Slips that are not positive, or that equal the
 * answer or each other by value, are skipped; a whole answer gets whole slips.
 */
function fracOptions(correct: Frac, slips: Frac[]): ChoiceOption[] {
  const key = ([p, q]: Frac) => fracAnswer(p, q);
  const whole = correct[0] % correct[1] === 0;
  const seen = new Set([key(correct)]);
  const picked: Frac[] = [];
  const [p, q] = correct;
  const near: Frac[] = [
    [p + q, q],
    [p - q, q],
    [2 * p, q],
    [p, 2 * q],
    [p + 2 * q, q],
    [p + 1, q],
    [p - 1, q],
    [p + 3 * q, q],
  ];
  for (const f of [...slips, ...near]) {
    if (picked.length === 3) break;
    if (!Number.isInteger(f[0]) || !Number.isInteger(f[1]) || f[1] === 0 || f[0] / f[1] <= 0) continue;
    if (whole && f[0] % f[1] !== 0) continue;
    if (seen.has(key(f))) continue;
    seen.add(key(f));
    picked.push(f);
  }
  return options(
    { tex: fracTex(p, q), answer: fracAnswer(p, q) },
    ...picked.sort((x, y) => x[0] / x[1] - y[0] / y[1]).map(([a, b]) => ({ tex: fracTex(a, b), answer: fracAnswer(a, b) })),
  );
}

/** `x - 3`, `x + 3` or `x`. */
const xMinus = (v: number) => (v === 0 ? 'x' : v > 0 ? `x - ${v}` : `x + ${-v}`);

/** A list in prose: `a, b and c`. */
function listed(items: string[]): string {
  return items.length === 1 ? items[0] : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const ORDINAL = ['', 'smallest', 'second smallest', 'third smallest', 'fourth smallest', 'fifth smallest'];

/** Digit sum, repeated down to one digit. */
const digitalRoot = (n: number) => 1 + ((n - 1) % 9);

const isSquare = (n: number) => Number.isInteger(Math.sqrt(n));

/* ================================================================
 * Figures. Plain SVG text only (KaTeX cannot render inside SVG), and
 * `currentColor` throughout so a figure reads in either theme.
 * ================================================================ */

const f1 = (v: number) => v.toFixed(1);

/** `top` crops empty sky off the figure, so a flat drawing does not sit under a band of blank space. */
function svg(height: number, label: string, body: string[], top = 0): string {
  return [`<svg viewBox="0 ${f1(top)} 300 ${f1(height - top)}" width="100%" role="img" aria-label="${label}">`, ...body, '</svg>'].join('');
}

const seg = (x1: number, y1: number, x2: number, y2: number, dashed = false) =>
  `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="currentColor" stroke-width="2"${dashed ? ' stroke-dasharray="5 4"' : ''} />`;

const thin = (x1: number, y1: number, x2: number, y2: number) =>
  `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" />`;

const txt = (x: number, y: number, text: string, anchor: 'start' | 'middle' | 'end' = 'middle', size = 13) =>
  `<text x="${f1(x)}" y="${f1(y)}" font-size="${size}" fill="currentColor" text-anchor="${anchor}" dominant-baseline="middle">${text}</text>`;

/** A point's name, italic like the $A$ and $B$ the prose sets in maths. */
const point = (x: number, y: number, name: string) =>
  `<text x="${f1(x)}" y="${f1(y)}" font-size="16" font-style="italic" fill="currentColor" text-anchor="middle" dominant-baseline="middle">${name}</text>`;

const dot = (x: number, y: number) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="3.5" fill="currentColor" />`;

/* ================================================================
 * Lesson 1: Casework
 * ================================================================ */

/* ---------- whole-number triangles with a given perimeter ---------- */

interface TriangleParams {
  P: number;
  /** All three sides different. */
  scalene: boolean;
}

/** For each longest side c, the range of the middle side b. */
function triangleCases({ P, scalene }: TriangleParams): { c: number; lo: number; hi: number }[] {
  const out: { c: number; lo: number; hi: number }[] = [];
  for (let c = Math.ceil(P / 3); 2 * c < P; c += 1) {
    const rest = P - c;
    const lo = scalene ? Math.floor(rest / 2) + 1 : Math.ceil(rest / 2);
    const hi = scalene ? c - 1 : c;
    if (hi >= lo) out.push({ c, lo, hi });
  }
  return out;
}

const triangleCount = (p: TriangleParams) => triangleCases(p).reduce((t, { lo, hi }) => t + hi - lo + 1, 0);

/** Sorted triples a <= b <= c adding to P, with `ok` deciding which count. */
function tripleCount(P: number, ok: (a: number, b: number, c: number) => boolean): number {
  let count = 0;
  for (let a = 1; a <= P; a += 1) for (let b = a; a + b < P; b += 1) {
    const c = P - a - b;
    if (c >= b && ok(a, b, c)) count += 1;
  }
  return count;
}

const cmStTriangles: Generator<TriangleParams> = {
  id: 'cm-st-triangles',
  sample(rng, difficulty) {
    return difficulty >= 2 ? { P: rng.int(12, 40), scalene: true } : { P: rng.int(7, 36), scalene: false };
  },
  render(p) {
    return typed(
      [
        say(
          p.scalene
            ? `How many triangles have whole-number sides, all three different, and a perimeter of ${p.P}?`
            : `How many different triangles have whole-number sides and a perimeter of ${p.P}?`,
        ),
        say('Triangles with the same three side lengths count once.'),
      ],
      triangleCount(p),
      '\\text{triangles} =',
    );
  },
  choices(p) {
    const right = triangleCount(p);
    const any = tripleCount(p.P, () => true);
    const flat = tripleCount(p.P, (a, b, c) => a + b >= c);
    const all = triangleCount({ P: p.P, scalene: false });
    return numberOptions(right, p.scalene ? [all, right + 1, any] : [any, flat, right + 1], 1, 1);
  },
  solution(p) {
    const cases = triangleCases(p);
    const cMin = cases[0].c;
    const cMax = cases[cases.length - 1].c;
    const steps: SolutionStep[] = [
      { text: `Split into cases by the longest side $c$. The other two add to $${p.P} - c$, which must be more than $c$, so $c < ${num(p.P / 2)}$. Being the longest, $c$ is at least a third of $${p.P}$:` },
      { tex: cMin === cMax ? `c = ${cMin}` : `${cMin} \\le c \\le ${cMax}` },
      {
        text: p.scalene
          ? 'For each $c$, the middle side $b$ runs from just over half of what is left up to $c - 1$, and the shortest side is the rest:'
          : 'For each $c$, the middle side $b$ runs from half of what is left up to $c$, and the shortest side is the rest:',
      },
    ];
    for (const { c, lo, hi } of cases) {
      const count = hi - lo + 1;
      const range = count === 1 ? `b = ${lo}` : count === 2 ? `b = ${lo}, ${hi}` : `b = ${lo} \\text{ to } ${hi}`;
      steps.push({ tex: `c = ${c}: \\ ${range}, \\ ${count} \\text{ way${count === 1 ? '' : 's'}}` });
    }
    if (cases.length > 1) steps.push({ tex: `${cases.map(({ lo, hi }) => hi - lo + 1).join(' + ')} = ${triangleCount(p)}` });
    return steps;
  },
};

/* ---------- two absolute values: split the number line ---------- */

interface AbsParams {
  a: number;
  b: number;
  c: number;
}

const absSolutions = ({ a, b, c }: AbsParams): [number, number, number] => [(a + b - c) / 2, b - a, (a + b + c) / 2];

const cmStAbsRegions: Generator<AbsParams> = {
  id: 'cm-st-abs-regions',
  sample(rng, difficulty) {
    for (;;) {
      const a = difficulty >= 2 ? rng.int(-12, 2) : rng.int(0, 10);
      const b = a + rng.int(2, difficulty >= 2 ? 14 : 9);
      const c = b - a + 2 * rng.int(1, difficulty >= 2 ? 8 : 5);
      const values = absSolutions({ a, b, c });
      if (new Set(values).size < 3) continue;
      return { a, b, c };
    }
  },
  render(p) {
    const { a, b, c } = p;
    const [low, mid, high] = absSolutions(p);
    return {
      kind: 'tiles',
      prompt: [
        say('Split the number line where each bracket changes sign, and solve on each piece.'),
        show(`|${xMinus(a)}| + |${xMinus(b)}| = ${c}`),
        say('On the middle piece the total never changes: fill in what it is.'),
      ],
      // Each case is braced so it never breaks inside itself, and no comma is
      // left to open a line when the row wraps between cases.
      template: `{x < ${a}{:}} \\ x = {0} \\quad {${a} \\le x \\le ${b}{:}} \\ \\text{total} = {1} \\quad {x > ${b}{:}} \\ x = {2}`,
      bank: numberBank([low, mid, high], [c, a + b, a - c, b + c, c - mid, low - 1, high + 1], 3, 1, -100),
      answer: [num(low), num(mid), num(high)],
    };
  },
  solution(p) {
    const { a, b, c } = p;
    const [low, mid, high] = absSolutions(p);
    return [
      { text: `Below $${a}$ both brackets are negative, so each is turned round:` },
      { tex: `(${a} - x) + (${b} - x) = ${c}` },
      { tex: `${a + b === 0 ? '-2x' : `${a + b} - 2x`} = ${c}, \\qquad x = ${num(low)}` },
      { text: `That is below $${a}$, so it counts. Between $${a}$ and $${b}$ only the second bracket is turned round:` },
      { tex: `(${xMinus(a)}) + (${b} - x) = ${mid}` },
      { text: `The $x$ cancels, and $${mid}$ is not $${c}$, so there is no solution there. Above $${b}$ neither is turned:` },
      { tex: `(${xMinus(a)}) + (${xMinus(b)}) = ${c}` },
      { tex: `${a + b === 0 ? '2x' : `2x ${a + b > 0 ? '-' : '+'} ${Math.abs(a + b)}`} = ${c}, \\qquad x = ${num(high)}` },
    ];
  },
};

/* ---------- pairs under a line: one case per value of y ---------- */

interface CaseTableParams {
  a: number;
  b: number;
  n: number;
}

/** For y = 1, 2, …: how many x >= 1 have ax + by <= n. */
function caseCounts({ a, b, n }: CaseTableParams): number[] {
  const out: number[] = [];
  for (let y = 1; n - b * y >= a; y += 1) out.push(Math.floor((n - b * y) / a));
  return out;
}

const lhs = ({ a, b }: CaseTableParams) => `${a === 1 ? '' : a}x + ${b}y`;

const cmStCaseTable: Generator<CaseTableParams> = {
  id: 'cm-st-case-table',
  sample(rng, difficulty) {
    for (;;) {
      const a = difficulty >= 2 ? rng.pick([2, 3]) : 1;
      const b = rng.int(a + 1, difficulty >= 2 ? 5 : 4);
      const n = rng.int(a + b, a + 6 * b);
      const rows = caseCounts({ a, b, n }).length;
      if (rows >= 3 && rows <= 5) return { a, b, n };
    }
  },
  render(p) {
    const counts = caseCounts(p);
    const total = counts.reduce((t, v) => t + v, 0);
    return {
      kind: 'table',
      prompt: [
        say('How many pairs of positive whole numbers $(x, y)$ satisfy this?'),
        show(`${lhs(p)} \\le ${p.n}`),
        say('Take one case for each value of $y$: fill in how many values of $x$ work, then the total.'),
      ],
      columns: ['y', '\\text{values of } x'],
      rows: [...counts.map((_, i) => [`${i + 1}`, null]), ['\\text{total}', null]],
      bank: numberBank([...counts, total], [p.n - p.b, total + counts.length, total - counts[counts.length - 1], counts[0] + 1], 3),
      answer: [...counts, total].map(num),
    };
  },
  solution(p) {
    const counts = caseCounts(p);
    const steps: SolutionStep[] = [
      { text: `Fix $y$ and count the $x$ that fit what is left of $${p.n}$:` },
    ];
    counts.forEach((count, i) => {
      const y = i + 1;
      const room = p.n - p.b * y;
      steps.push({
        tex: p.a === 1 ? `y = ${y}: \\ x \\le ${room}, \\ ${count} \\text{ values}` : `y = ${y}: \\ ${p.a}x \\le ${room}, \\ x \\le ${count}`,
      });
    });
    steps.push({ text: `When $y = ${counts.length + 1}$ there is no room left for $x$. Add the cases:` });
    steps.push({ tex: `${counts.join(' + ')} = ${counts.reduce((t, v) => t + v, 0)}` });
    return steps;
  },
};

/* ---------- last digits of n² (or n² + n), one case per last digit ---------- */

interface EndsParams {
  N: number;
  d: number;
  /** n² at difficulty 1; n² + n, which is n(n + 1), at difficulty 2. */
  pronic: boolean;
}

const endOf = (u: number, pronic: boolean) => (pronic ? u * (u + 1) : u * u) % 10;

const unitsFor = ({ d, pronic }: EndsParams) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((u) => endOf(u, pronic) === d);

/** Whole numbers from 1 to N ending in the digit u. */
const endingIn = (N: number, u: number) => (u === 0 ? Math.floor(N / 10) : Math.floor((N - u) / 10) + 1);

const endsAnswer = (p: EndsParams) => unitsFor(p).reduce((t, u) => t + endingIn(p.N, u), 0);

const cmStSquareEnds: Generator<EndsParams> = {
  id: 'cm-st-square-ends',
  sample(rng, difficulty) {
    for (;;) {
      const N = difficulty >= 2 ? rng.int(100, 600) : rng.int(40, 400);
      if (N % 10 === 0) continue;
      return difficulty >= 2 ? { N, d: rng.pick([0, 2, 6]), pronic: true } : { N, d: rng.pick([1, 4, 5, 6, 9]), pronic: false };
    }
  },
  render(p) {
    const expr = p.pronic ? 'n^2 + n' : 'n^2';
    return typed(
      [say(`How many whole numbers $n$ from $1$ to $${p.N}$ make $${expr}$ end in the digit $${p.d}$?`)],
      endsAnswer(p),
      '\\text{count} =',
    );
  },
  choices(p) {
    const units = unitsFor(p);
    const tens = Math.floor(p.N / 10);
    return numberOptions(endsAnswer(p), [units.length * tens, units.length * (tens + 1), endsAnswer(p) + 1, tens], 1, 1);
  },
  solution(p) {
    const units = unitsFor(p);
    const lasts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((u) => endOf(u, p.pronic)).join(', ');
    const steps: SolutionStep[] = [
      {
        text: p.pronic
          ? 'Only the last digit of $n$ decides the last digit of $n^2 + n$, which is $n(n + 1)$. For $n$ ending in $0, 1, \\ldots, 9$ it ends in'
          : 'Only the last digit of $n$ decides the last digit of $n^2$. For $n$ ending in $0, 1, \\ldots, 9$ it ends in',
      },
      { tex: lasts },
      { text: `So the cases are $n$ ending in ${listed(units.map((u) => `$${u}$`))}. Count each from $1$ to $${p.N}$:` },
    ];
    for (const u of units) {
      const first = u === 0 ? 10 : u;
      const last = u === 0 ? 10 * Math.floor(p.N / 10) : u + 10 * Math.floor((p.N - u) / 10);
      steps.push({ tex: `${first}, ${first + 10}, \\ldots, ${last}: \\ ${endingIn(p.N, u)}` });
    }
    if (units.length > 1) steps.push({ tex: `${units.map((u) => endingIn(p.N, u)).join(' + ')} = ${endsAnswer(p)}` });
    return steps;
  },
};

/* ================================================================
 * Lesson 2: Extreme Cases and Invariants
 * ================================================================ */

/* ---------- socks in the dark: the worst case ---------- */

const COLOURS = ['red', 'blue', 'green', 'black', 'white', 'grey'];

interface SocksParams {
  colours: number[];
  counts: number[];
  k: number;
}

const worst = ({ counts, k }: SocksParams) => counts.map((c) => Math.min(c, k - 1));
const socksAnswer = (p: SocksParams) => worst(p).reduce((t, v) => t + v, 0) + 1;

const cmStSocksTable: Generator<SocksParams> = {
  id: 'cm-st-socks-table',
  sample(rng, difficulty) {
    const n = difficulty >= 2 ? 4 : 3;
    const k = difficulty >= 2 ? rng.int(5, 9) : rng.int(4, 7);
    const colours = rng.sample([0, 1, 2, 3, 4, 5], n);
    const small = rng.sample(
      Array.from({ length: k - 2 }, (_, i) => i + 1),
      n - 1,
    );
    const big = rng.int(k, k + 8);
    const at = rng.int(0, n - 1);
    const counts = [...small];
    counts.splice(at, 0, big);
    return { colours, counts, k };
  },
  render(p) {
    const names = p.colours.map((c) => COLOURS[c]);
    const total = p.counts.reduce((t, v) => t + v, 0);
    const answer = socksAnswer(p);
    const most = worst(p);
    const big = Math.max(...p.counts);
    return {
      kind: 'table',
      prompt: [
        say(`A drawer holds ${listed(p.counts.map((c, i) => `${c} ${names[i]}`))} socks. In the dark, how many must you take out to be sure of ${p.k} socks of the same colour?`),
        say(`Fill in the worst case: the most of each colour you could take without reaching ${p.k}, then the answer.`),
      ],
      columns: ['\\text{colour}', '\\text{most}'],
      rows: [...names.map((name) => [`\\text{${name}}`, null]), [`\\text{sure of } ${p.k}`, null]],
      bank: numberBank([...most, answer], [p.colours.length * (p.k - 1) + 1, total, answer - 1, big, p.k * p.colours.length], 3),
      answer: [...most, answer].map(num),
    };
  },
  solution(p) {
    const names = p.colours.map((c) => COLOURS[c]);
    const most = worst(p);
    const steps: SolutionStep[] = [
      { text: `Imagine the unluckiest draw. You can hold up to ${p.k - 1} of a colour without having ${p.k} of it, but never more of a colour than the drawer holds:` },
    ];
    p.counts.forEach((c, i) => {
      steps.push({
        tex: c >= p.k ? `\\text{${names[i]}}: \\ ${p.k - 1}` : `\\text{${names[i]}}: \\ \\text{all } ${c}`,
      });
    });
    steps.push(
      { text: 'That many socks can still miss. One more must make a colour reach it:' },
      { tex: `${most.join(' + ')} + 1 = ${socksAnswer(p)}` },
    );
    return steps;
  },
};

/* ---------- turning cups over: parity and a ceiling ---------- */

interface CupsParams {
  n: number;
  k: number;
}

/** The most times a cup can be turned in m moves and still end up the right way: odd, at most m. */
const oddCap = (m: number) => (m % 2 === 1 ? m : m - 1);

const cupsWork = ({ n, k }: CupsParams, m: number) => m * k >= n && (m * k - n) % 2 === 0 && m * k <= n * oddCap(m);

function cupsMoves(p: CupsParams): number {
  for (let m = 1; m <= 4 * p.n; m += 1) if (cupsWork(p, m)) return m;
  return -1;
}

const cmStCups: Generator<CupsParams> = {
  id: 'cm-st-cups',
  sample(rng, difficulty) {
    for (;;) {
      const n = difficulty >= 2 ? rng.int(10, 24) : rng.int(5, 12);
      const k = rng.int(difficulty >= 2 ? 3 : 2, n - 1);
      const moves = cupsMoves({ n, k });
      if (moves < 0) continue;
      // At difficulty 2 the obvious answer is always wrong.
      if (difficulty >= 2 && moves === Math.ceil(n / k)) continue;
      return { n, k };
    }
  },
  render(p) {
    return typed(
      [
        say(`${p.n} cups stand upside down on a table. A move turns over exactly ${p.k} of them, any ${p.k} you like.`),
        say('What is the fewest moves that leaves every cup the right way up?'),
      ],
      cupsMoves(p),
      '\\text{moves} =',
    );
  },
  choices(p) {
    const right = cupsMoves(p);
    return numberOptions(right, [Math.ceil(p.n / p.k), right + 1, right - 1, p.n - p.k], 1, 1);
  },
  solution(p) {
    const { n, k } = p;
    const right = cupsMoves(p);
    const steps: SolutionStep[] = [
      { text: `In $m$ moves there are $${k}m$ turns. Every cup needs an odd number of turns, so beyond one each, turns come in pairs: $${k}m$ must be at least $${n}$ and differ from it by an even number. And no cup can be turned more times than there are moves.` },
    ];
    for (let m = Math.ceil(n / k); m <= right; m += 1) {
      const turns = m * k;
      if (m === right) {
        steps.push({
          text: turns === n
            ? `$m = ${m}$: $${turns}$ turns, one for each cup.`
            : `$m = ${m}$: $${turns}$ turns, $${turns - n}$ more than $${n}$, which is even, and the extra turns can be shared out in pairs so each cup is turned an odd number of times, no more than $${m}$. It works.`,
        });
      } else if ((turns - n) % 2 !== 0) {
        steps.push({ text: `$m = ${m}$: $${turns}$ turns, $${turns - n}$ more than $${n}$, which is odd. No.` });
      } else {
        steps.push({ text: `$m = ${m}$: $${turns}$ turns, but in $${m}$ moves a cup can be turned at most $${oddCap(m)}$ time${oddCap(m) === 1 ? '' : 's'} (odd, and no more than $${m}$), which is only $${n * oddCap(m)}$ turns in all. No.` });
      }
    }
    steps.push({ text: `So the fewest is $${right}$.` });
    return steps;
  },
};

/* ---------- numbers on a board: what stays the same ---------- */

interface BoardParams {
  /** Difficulty 1: 1..top, a and b become a + b + shift. */
  top: number;
  shift: number;
  /** Difficulty 2: from..to, a and b become (a + s)(b + s) - s. */
  from: number;
  to: number;
  s: number;
  product: boolean;
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

function boardAnswer(p: BoardParams): number {
  if (!p.product) return (p.top * (p.top + 1)) / 2 + p.shift * (p.top - 1);
  return range(p.from, p.to).reduce((t, x) => t * (x + p.s), 1) - p.s;
}

const boardRule = (p: BoardParams) => {
  if (p.product) return p.s === 1 ? 'ab + a + b' : `ab + ${p.s}a + ${p.s}b + ${p.s * p.s - p.s}`;
  return `a + b ${p.shift > 0 ? '+' : '-'} ${Math.abs(p.shift)}`;
};

const cmStBoard: Generator<BoardParams> = {
  id: 'cm-st-board',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const s = rng.pick([1, 2]);
      const len = rng.int(3, 5);
      const from = rng.int(1, (s === 1 ? 9 : 8) - len + 1);
      return { top: 0, shift: 0, from, to: from + len - 1, s, product: true };
    }
    return { top: rng.int(8, 30), shift: rng.pick([-3, -2, -1, 1, 2, 3]), from: 0, to: 0, s: 0, product: false };
  },
  render(p) {
    const numbers = p.product ? range(p.from, p.to).join(', ') : `1, 2, 3, \\ldots, ${p.top}`;
    const count = p.product ? p.to - p.from + 1 : p.top;
    return typed(
      [
        say('These numbers are written on a board:'),
        show(numbers),
        say(`A move rubs out two of them, $a$ and $b$, and writes $${boardRule(p)}$ in their place. After ${count - 1} moves one number is left. What is it?`),
      ],
      boardAnswer(p),
      '\\text{last number} =',
    );
  },
  choices(p) {
    const right = boardAnswer(p);
    if (!p.product) {
      const sum = (p.top * (p.top + 1)) / 2;
      return numberOptions(right, [sum, sum + p.shift * p.top, sum - p.shift * (p.top - 1), sum + p.shift * (p.top - 2)], 1, 1);
    }
    const xs = range(p.from, p.to);
    const shifted = xs.reduce((t, x) => t * (x + p.s), 1);
    const plain = xs.reduce((t, x) => t * x, 1);
    return numberOptions(right, [shifted, plain, shifted + p.s, shifted - p.s * (xs.length - 1)], 1, 1);
  },
  solution(p) {
    if (!p.product) {
      const sum = (p.top * (p.top + 1)) / 2;
      const moves = p.top - 1;
      return [
        { text: `Watch the total. A move takes $a + b$ off and puts $${boardRule(p)}$ back, so the total ${p.shift > 0 ? 'rises' : 'falls'} by exactly $${Math.abs(p.shift)}$, whichever two are chosen.` },
        { tex: `1 + 2 + \\cdots + ${p.top} = ${sum}` },
        { text: `There are $${moves}$ moves, and the last number is the final total:` },
        { tex: `${sum} ${p.shift > 0 ? '+' : '-'} ${moves} \\times ${Math.abs(p.shift)} = ${boardAnswer(p)}` },
      ];
    }
    const xs = range(p.from, p.to);
    const shifted = xs.reduce((t, x) => t * (x + p.s), 1);
    return [
      { text: `The rule is $(a + ${p.s})(b + ${p.s}) - ${p.s}$. So if every number carries $+${p.s}$, a move swaps $a + ${p.s}$ and $b + ${p.s}$ for their product: the product of all the numbers plus $${p.s}$ never changes.` },
      { tex: `${xs.map((x) => x + p.s).join(' \\times ')} = ${shifted}` },
      { text: `At the end one number is left, and it plus $${p.s}$ is that product:` },
      { tex: `${shifted} - ${p.s} = ${boardAnswer(p)}` },
    ];
  },
};

/* ---------- no two adding to s: pair the numbers up ---------- */

interface PairSumParams {
  n: number;
  s: number;
  /** Difficulty 2 asks how many guarantee a pair, with s past n + 1. */
  sure: boolean;
}

/** The smallest number of each pair (a, s - a) inside 1..n. */
const pairFirst = ({ n, s }: PairSumParams) => Math.max(1, s - n);
const pairLast = ({ s }: PairSumParams) => Math.ceil(s / 2) - 1;
const pairCount = (p: PairSumParams) => pairLast(p) - pairFirst(p) + 1;
const safeMost = (p: PairSumParams) => p.n - pairCount(p);
const pairSumAnswer = (p: PairSumParams) => (p.sure ? safeMost(p) + 1 : safeMost(p));

const cmStPairSum: Generator<PairSumParams> = {
  id: 'cm-st-pair-sum',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const n = rng.int(12, 40);
      return { n, s: rng.int(n + 2, 2 * n - 3), sure: true };
    }
    const n = rng.int(12, 60);
    return { n, s: rng.int(7, n + 1), sure: false };
  },
  render(p) {
    return p.sure
      ? typed(
          [say(`Different whole numbers are chosen from $1$ to $${p.n}$. How many must be chosen to be sure that two of them add up to $${p.s}$?`)],
          pairSumAnswer(p),
          '\\text{numbers} =',
        )
      : typed(
          [say(`What is the largest number of different whole numbers you can choose from $1$ to $${p.n}$ so that no two of them add up to $${p.s}$?`)],
          pairSumAnswer(p),
          '\\text{numbers} =',
        );
  },
  choices(p) {
    const right = pairSumAnswer(p);
    const half = Math.ceil(p.n / 2);
    return numberOptions(right, p.sure ? [right - 1, half + 1, pairCount(p) + 1, p.n - Math.floor((p.s - 1) / 2) + 1] : [half, right + 1, pairCount(p), p.n - p.s + 1], 1, 1);
  },
  solution(p) {
    const first = pairFirst(p);
    const last = pairLast(p);
    const pairs = pairCount(p);
    const free = p.n - 2 * pairs;
    const steps: SolutionStep[] = [
      { text: `Pair each number with the one it adds to $${p.s}$ with, where both are from $1$ to $${p.n}$:` },
      {
        tex:
          pairs > 3
            ? `(${first}, ${p.s - first}), \\ (${first + 1}, ${p.s - first - 1}), \\ \\ldots, \\ (${last}, ${p.s - last})`
            : range(first, last)
                .map((a) => `(${a}, ${p.s - a})`)
                .join(', \\ '),
      },
      { text: `That is $${pairs}$ pairs, using $${2 * pairs}$ of the $${p.n}$ numbers. At most one of each pair can be chosen, and the other $${free}$ numbers have no partner, so they are all safe:` },
      { tex: `${pairs} + ${free} = ${safeMost(p)}` },
    ];
    if (p.sure) {
      steps.push(
        { text: `So $${safeMost(p)}$ numbers can still avoid a pair. One more has to complete one:` },
        { tex: `${safeMost(p)} + 1 = ${pairSumAnswer(p)}` },
      );
    }
    return steps;
  },
};

/* ================================================================
 * Lesson 3: Generalization
 * ================================================================ */

/* ---------- small cases, then the pattern ---------- */

const PATTERNS = [
  {
    what: 'regions a page is cut into by $n$ straight lines, no two parallel and no three through one point',
    head: '\\text{regions}',
    start: 1,
    f: (n: number) => (n * (n + 1)) / 2 + 1,
    why: 'The $n$-th line crosses the other $n - 1$ lines, so it passes through $n$ regions and splits each in two, adding $n$:',
    formula: ['f(n) = 1 + (1 + 2 + \\cdots + n)', '= 1 + \\tfrac{1}{2}n(n + 1)'],
  },
  {
    what: 'regions a page is cut into by $n$ circles, every two crossing at two points and no three through one point (the outside counts)',
    head: '\\text{regions}',
    start: 1,
    f: (n: number) => n * n - n + 2,
    why: 'The $n$-th circle crosses the others at $2(n - 1)$ points, which cut it into $2(n - 1)$ arcs, and each arc splits a region in two:',
    formula: ['f(n) = 2 + 2(1 + 2 + \\cdots + (n - 1))', '= n^2 - n + 2'],
  },
  {
    what: 'diagonals of a polygon with $n$ sides',
    head: '\\text{diagonals}',
    start: 4,
    f: (n: number) => (n * (n - 3)) / 2,
    why: 'Each corner joins to every corner except itself and its two neighbours, and each diagonal is counted from both of its ends:',
    formula: ['f(n) = \\tfrac{1}{2}n(n - 3)'],
  },
  {
    what: 'matchsticks needed for an $n$ by $n$ grid of squares',
    head: '\\text{matchsticks}',
    start: 1,
    f: (n: number) => 2 * n * (n + 1),
    why: 'There are $n + 1$ rows of $n$ matches across and $n + 1$ columns of $n$ matches down:',
    formula: ['f(n) = 2n(n + 1)'],
  },
];

interface PatternParams {
  pattern: number;
  N: number;
}

const cmStPatternTable: Generator<PatternParams> = {
  id: 'cm-st-pattern-table',
  sample(rng, difficulty) {
    return { pattern: rng.int(0, PATTERNS.length - 1), N: difficulty >= 2 ? rng.int(20, 60) : rng.int(9, 16) };
  },
  render({ pattern, N }) {
    const t = PATTERNS[pattern];
    const n0 = t.start;
    const blanks = [n0 + 3, n0 + 4, N].map(t.f);
    const linear = t.f(n0 + 4) + (N - n0 - 4) * (t.f(n0 + 4) - t.f(n0 + 3));
    return {
      kind: 'table',
      prompt: [
        say(`Count the ${t.what}. The first cases are filled in.`),
        say(`Find the pattern, finish the table, and use it for $n = ${N}$.`),
      ],
      columns: ['n', t.head],
      rows: [
        ...[0, 1, 2].map((i) => [`${n0 + i}`, num(t.f(n0 + i))]),
        [`${n0 + 3}`, null],
        [`${n0 + 4}`, null],
        [`${N}`, null],
      ],
      bank: numberBank(blanks, [linear, t.f(N - 1), t.f(N + 1), blanks[0] + 1, blanks[1] + 2], 3),
      answer: blanks.map(num),
    };
  },
  solution({ pattern, N }) {
    const t = PATTERNS[pattern];
    const n0 = t.start;
    return [
      { text: `The table so far: ${[0, 1, 2, 3, 4].map((i) => `$${num(t.f(n0 + i))}$`).join(', ')}.` },
      { text: t.why },
      ...t.formula.map((tex) => ({ tex })),
      { tex: `f(${N}) = ${num(t.f(N))}` },
    ];
  },
};

/* ---------- the n-th term of a run-length sequence ---------- */

const RUNS = [
  { says: '$1$ once, $2$ twice, $3$ three times, and so on', show: '1, 2, 2, 3, 3, 3, 4, 4, 4, 4, \\ldots', end: (k: number) => (k * (k + 1)) / 2, endTex: (k: number) => `1 + 2 + \\cdots + ${k}` },
  { says: '$1$ once, $2$ three times, $3$ five times, and so on through the odd numbers', show: '1, 2, 2, 2, 3, 3, 3, 3, 3, 4, \\ldots', end: (k: number) => k * k, endTex: (k: number) => `1 + 3 + \\cdots + ${2 * k - 1}` },
  { says: '$1$ twice, $2$ four times, $3$ six times, and so on through the even numbers', show: '1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, \\ldots', end: (k: number) => k * (k + 1), endTex: (k: number) => `2 + 4 + \\cdots + ${2 * k}` },
];

interface NthParams {
  run: number;
  N: number;
}

function nthTerm({ run, N }: NthParams): number {
  let k = 1;
  while (RUNS[run].end(k) < N) k += 1;
  return k;
}

const cmStNthTerm: Generator<NthParams> = {
  id: 'cm-st-nth-term',
  sample(rng, difficulty) {
    return difficulty >= 2 ? { run: rng.pick([1, 2]), N: rng.int(50, 600) } : { run: 0, N: rng.int(30, 250) };
  },
  render(p) {
    const r = RUNS[p.run];
    return typed(
      [say(`A sequence lists ${r.says}:`), show(r.show), say(`What is term number ${p.N}?`)],
      nthTerm(p),
      '\\text{term} =',
    );
  },
  choices(p) {
    const k = nthTerm(p);
    return numberOptions(k, [k - 1, k + 1, Math.round(Math.sqrt(2 * p.N)), Math.round(Math.sqrt(p.N))], 1, 1);
  },
  solution(p) {
    const r = RUNS[p.run];
    const k = nthTerm(p);
    return [
      { text: 'Generalise from the start: the last copy of each number sits at a position you can add up.' },
      ...(k > 1 ? [{ tex: `${r.endTex(k - 1)} = ${r.end(k - 1)}` }] : []),
      { tex: `${r.endTex(k)} = ${r.end(k)}` },
      { text: `So the copies of $${k}$ fill positions $${k > 1 ? r.end(k - 1) + 1 : 1}$ to $${r.end(k)}$, and term $${p.N}$ is among them: it is $${k}$.` },
    ];
  },
};

/* ---------- alternating squares ---------- */

interface AltParams {
  n: number;
}

const altSquares = ({ n }: AltParams) => (n % 2 === 0 ? -1 : 1) * ((n * (n + 1)) / 2);

const altTex = ({ n }: AltParams) => (n % 2 === 0 ? `1^2 - 2^2 + 3^2 - 4^2 + \\cdots - ${n}^2` : `1^2 - 2^2 + 3^2 - \\cdots - ${n - 1}^2 + ${n}^2`);

const cmStAltSquares: Generator<AltParams> = {
  id: 'cm-st-alt-squares',
  sample(rng, difficulty) {
    return { n: difficulty >= 2 ? 2 * rng.int(5, 40) + 1 : 2 * rng.int(5, 40) };
  },
  render(p) {
    return typed([say('Work out the sum. The signs alternate all the way.'), show(altTex(p))], altSquares(p), '\\text{sum} =');
  },
  choices(p) {
    const right = altSquares(p);
    return numberOptions(right, [-right, right - p.n * (right > 0 ? 1 : -1), (right > 0 ? -1 : 1) * p.n * p.n / 2, right + p.n], 1, -1e9);
  },
  solution(p) {
    const { n } = p;
    const t = (n * (n + 1)) / 2;
    if (n % 2 === 0) {
      return [
        { text: 'Pair the terms. Each pair is a difference of two squares:' },
        { tex: `(2k - 1)^2 - (2k)^2 = -(4k - 1)` },
        { text: `So each pair is minus the sum of its two numbers: $-3$ from $1$ and $2$, $-7$ from $3$ and $4$, and so on. The whole sum is minus every number from $1$ to $${n}$:` },
        { tex: `-(1 + 2 + \\cdots + ${n})` },
        { tex: `= -\\frac{${n} \\times ${n + 1}}{2} = ${-t}` },
      ];
    }
    return [
      { text: `Pair all but the last term; the pairs make minus every number from $1$ to $${n - 1}$:` },
      { tex: `-(1 + 2 + \\cdots + ${n - 1}) = ${-((n - 1) * n) / 2}` },
      { text: `Then add the last square back:` },
      { tex: `${-((n - 1) * n) / 2} + ${n * n} = ${t}` },
      { text: `That is $1 + 2 + \\cdots + ${n}$, as the small cases $1, -3, 6, -10, 15$ suggest.` },
    ];
  },
};

/* ---------- every second person leaves ---------- */

interface CircleParams {
  n: number;
}

const powerBelow = (n: number) => 2 ** Math.floor(Math.log2(n));
const survivor = ({ n }: CircleParams) => 2 * (n - powerBelow(n)) + 1;

const cmStJosephus: Generator<CircleParams> = {
  id: 'cm-st-josephus',
  sample(rng, difficulty) {
    for (;;) {
      const n = difficulty >= 2 ? rng.int(41, 300) : rng.int(10, 40);
      if (powerBelow(n) !== n) return { n };
    }
  },
  render(p) {
    return typed(
      [
        say(`${p.n} people, numbered 1 to ${p.n}, stand in a circle in order. Going round, every second person leaves: 2 leaves first, then 4, then 6, and so on round and round the circle.`),
        say('What number is the last person left?'),
      ],
      survivor(p),
      '\\text{number} =',
    );
  },
  choices(p) {
    const right = survivor(p);
    const L = p.n - powerBelow(p.n);
    return numberOptions(right, [1, 2 * L, 2 * L - 1, right + 2, p.n - 1], 2, 1);
  },
  solution(p) {
    const P = powerBelow(p.n);
    const L = p.n - P;
    return [
      { text: 'Small cases first. With a power of 2 in the circle, each lap removes half, and person 1 starts every lap, so person 1 is last.' },
      { text: `Here $${p.n}$ is $${L}$ more than a power of 2:` },
      { tex: `${p.n} = ${P} + ${L}` },
      { text: `Once $${L}$ people have left, $${P}$ remain and the next person starts a new count, so that person is last. The first $${L}$ to leave are the even numbers up to $${2 * L}$, and the next one along is` },
      { tex: `2 \\times ${L} + 1 = ${survivor(p)}` },
    ];
  },
};

/* ================================================================
 * Lesson 4: Using Symmetry
 * ================================================================ */

/* ---------- the shortest walk via the river: reflect ---------- */

const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [12, 35, 37],
  [9, 40, 41],
];

interface RiverParams {
  d: number;
  a: number;
  b: number;
  h: number;
  /** Difficulty 2 asks where the walk touches the bank. */
  touch: boolean;
}

const touchAt = ({ d, a, b }: RiverParams) => (d * a) / (a + b);

function riverSvg(p: RiverParams): string {
  const g = 160;
  const x0 = 55;
  const k = Math.min(190 / p.d, 125 / Math.max(p.a, p.b));
  const xB = x0 + p.d * k;
  const yA = g - p.a * k;
  const yB = g - p.b * k;
  const xP = x0 + touchAt(p) * k;
  return svg(200, 'Two points A and B on the same side of a straight river bank, with a walk from A down to the bank and up to B', [
    `<rect x="10" y="${g}" width="280" height="34" fill="currentColor" fill-opacity="0.1" />`,
    seg(10, g, 290, g),
    thin(x0, yA, x0, g),
    thin(xB, yB, xB, g),
    seg(x0, yA, xP, g, true),
    seg(xP, g, xB, yB, true),
    dot(x0, yA),
    dot(xB, yB),
    dot(xP, g),
    point(x0, yA - 13, 'A'),
    point(xB, yB - 13, 'B'),
    txt(x0 - 7, (yA + g) / 2, `${p.a} m`, 'end', 12),
    txt(xB + 7, (yB + g) / 2, `${p.b} m`, 'start', 12),
    txt((x0 + xB) / 2, g + 24, `${p.d} m`, 'middle', 12),
    ...(p.touch ? [txt((x0 + xP) / 2, g + 10, '?', 'middle', 12)] : []),
    txt(286, g + 24, 'river', 'end', 11),
  ], Math.max(0, Math.min(yA, yB) - 28));
}

function sampleRiver(rng: Rng, touch: boolean): RiverParams {
  for (;;) {
    const [p, q, r] = rng.pick(TRIPLES);
    const scale = rng.int(1, Math.max(1, Math.floor(100 / r)));
    const flip = rng.chance(0.5);
    const d = (flip ? p : q) * scale;
    const s = (flip ? q : p) * scale;
    const h = r * scale;
    const a = rng.int(1, s - 1);
    const b = s - a;
    if (a === b || Math.min(a, b) < 0.25 * Math.max(a, b)) continue;
    if (d < 0.6 * Math.max(a, b) || Math.min(a, b) < 0.12 * d) continue;
    if (touch && (d * a) % s !== 0) continue;
    if (touch && ((d * a) / s < 0.2 * d || (d * a) / s > 0.8 * d)) continue;
    return { d, a, b, h, touch };
  }
}

const riverStory = (p: RiverParams) =>
  say(`$A$ and $B$ are on the same side of a straight river. $A$ is ${p.a} m from the bank, $B$ is ${p.b} m from it, and the points of the bank nearest them are ${p.d} m apart. Sam walks from $A$ to the river, fills a bottle, then walks to $B$.`);

const cmStRiver: Generator<RiverParams> = {
  id: 'cm-st-river',
  sample(rng, difficulty) {
    return sampleRiver(rng, difficulty >= 2);
  },
  render(p) {
    return p.touch
      ? typed(
          [riverStory(p), { kind: 'diagram', svg: riverSvg(p) }, say('On the shortest walk, how far along the bank from the point nearest $A$ does Sam reach the river, in metres?')],
          touchAt(p),
          '\\text{distance} =',
        )
      : typed(
          [riverStory(p), { kind: 'diagram', svg: riverSvg(p) }, say('What is the length of the shortest possible walk, in metres?')],
          p.h,
          '\\text{walk} =',
        );
  },
  choices(p) {
    if (p.touch) {
      const x = touchAt(p);
      return numberOptions(x, [p.d - x, p.d / 2, x + 1, x - 1], 1, 1);
    }
    return numberOptions(p.h, [p.a + p.b + p.d, p.d + Math.abs(p.a - p.b), p.h + Math.min(p.a, p.b), p.h - 1], 1, 1);
  },
  solution(p) {
    const s = p.a + p.b;
    if (p.touch) {
      return [
        { text: `Reflect $B$ in the bank. The shortest walk is the straight line from $A$ to the reflection, and it crosses the bank where the two right triangles either side are similar. Their heights are $${p.a}$ and $${p.b}$, so they split the $${p.d}$ m in the ratio $${p.a} : ${p.b}$:` },
        { tex: `\\frac{${p.a}}{${s}} \\times ${p.d} = ${num(touchAt(p))}` },
      ];
    }
    return [
      { text: `Reflect $B$ in the bank to a point $${p.b}$ m on the far side. Any walk to the river and on to $B$ is as long as the walk to the river and on to the reflection, and that is shortest as a straight line.` },
      { text: `The straight line is the hypotenuse of a right triangle $${p.d}$ across and $${s}$ down, the $${p.a}$ m to the bank and the $${p.b}$ m beyond it:` },
      { tex: `\\sqrt{${p.d}^2 + ${s}^2} = \\sqrt{${p.d * p.d + s * s}} = ${p.h}` },
    ];
  },
};

/* ---------- the same walk, the working as tiles ---------- */

const cmStRiverTiles: Generator<RiverParams> = {
  id: 'cm-st-river-tiles',
  sample(rng) {
    return sampleRiver(rng, false);
  },
  render(p) {
    const s = p.a + p.b;
    return {
      kind: 'tiles',
      prompt: [
        riverStory(p),
        { kind: 'diagram', svg: riverSvg(p) },
        say(`Reflect $B$ in the bank. The shortest walk is then the hypotenuse of a right triangle ${p.d} m across: fill in its height, the walk squared, and the walk, in metres.`),
      ],
      template: '\\text{height} = {0} \\quad \\text{walk}^2 = {1} \\quad \\text{walk} = {2}',
      bank: numberBank([s, p.h * p.h, p.h], [Math.abs(p.a - p.b), p.d * p.d + (p.a - p.b) ** 2, p.a + p.b + p.d, p.h + 1, s * s], 3),
      answer: [num(s), num(p.h * p.h), num(p.h)],
    };
  },
  solution(p) {
    const s = p.a + p.b;
    return [
      { text: `The reflection of $B$ is $${p.b}$ m beyond the bank, so the triangle's height is the $${p.a}$ m on this side and those $${p.b}$ m:` },
      { tex: `${p.a} + ${p.b} = ${s}` },
      { tex: `${p.d}^2 + ${s}^2 = ${p.d * p.d} + ${s * s} = ${p.h * p.h}` },
      { tex: `\\sqrt{${p.h * p.h}} = ${p.h}` },
    ];
  },
};

/* ---------- f(x) + f(1 - x) = 1: pair the terms ---------- */

interface PairFnParams {
  /** f(x) = c²ˣ... written with base a = c². */
  c: number;
  n: number;
  /** Difficulty 2 runs the sum on to f(1), which has no partner. */
  toOne: boolean;
}

const pairFnAnswer = ({ c, n, toOne }: PairFnParams): Frac => (toOne ? [(n - 1) * (c + 1) + 2 * c, 2 * (c + 1)] : [n - 1, 2]);

const cmStPairFunction: Generator<PairFnParams> = {
  id: 'cm-st-pair-function',
  sample(rng, difficulty) {
    return { c: rng.int(2, 5), n: rng.int(difficulty >= 2 ? 10 : 5, 60), toOne: difficulty >= 2 };
  },
  render(p) {
    const a = p.c * p.c;
    const sum = p.toOne
      ? // Braced in halves: a line too long for a phone breaks at the middle `+`.
        `{f(\\tfrac{1}{${p.n}}) + f(\\tfrac{2}{${p.n}})} + {\\cdots + f(\\tfrac{${p.n - 1}}{${p.n}}) + f(1)}`
      : `f(\\tfrac{1}{${p.n}}) + f(\\tfrac{2}{${p.n}}) + \\cdots + f(\\tfrac{${p.n - 1}}{${p.n}})`;
    const [top, bottom] = pairFnAnswer(p);
    return typed(
      [say('A function is defined by'), show(`f(x) = \\frac{${a}^x}{${a}^x + ${p.c}}`), say('Work out the sum'), show(sum)],
      fracAnswer(top, bottom),
      '\\text{sum} =',
      FRACTION_KEYS,
    );
  },
  choices(p) {
    const right = pairFnAnswer(p);
    const half: Frac = [p.n - 1, 2];
    return fracOptions(right, p.toOne ? [half, [p.n, 2], [p.n + 1, 2], [p.n + 1, 2 * p.n]] : [[p.n, 2], [p.n + 1, 2], [p.n - 1, 1], [p.n - 1, 4]]);
  },
  solution(p) {
    const { c, n } = p;
    const a = c * c;
    const [top, bottom] = pairFnAnswer(p);
    const steps: SolutionStep[] = [
      { text: `Pair $f(x)$ with $f(1 - x)$. Multiply the top and bottom of $f(1 - x)$ by $${a}^x$:` },
      { tex: `f(1 - x) = \\frac{${a}}{${a} + ${c} \\times ${a}^x} = \\frac{${c}}{${c} + ${a}^x}` },
      { tex: `f(x) + f(1 - x) = \\frac{${a}^x + ${c}}{${a}^x + ${c}} = 1` },
      n % 2 === 1
        ? { text: `So $f(\\tfrac{k}{${n}})$ and $f(\\tfrac{${n} - k}{${n}})$ add to $1$. The $${n - 1}$ terms from $k = 1$ to $${n - 1}$ make $${(n - 1) / 2}$ such pairs:` }
        : { text: `So $f(\\tfrac{k}{${n}})$ and $f(\\tfrac{${n} - k}{${n}})$ add to $1$. The $${n - 1}$ terms from $k = 1$ to $${n - 1}$ make $${n / 2 - 1}$ such pairs and the middle term, $f(\\tfrac{1}{2}) = \\tfrac{1}{2}$, which is half a pair:` },
      { tex: `\\frac{${n - 1}}{2}${n % 2 === 1 ? ` = ${(n - 1) / 2}` : ''}` },
    ];
    if (p.toOne) {
      steps.push(
        { text: '$f(1)$ has no partner in the sum, so work it out on its own:' },
        { tex: `f(1) = \\frac{${a}}{${a} + ${c}} = \\frac{${c}}{${c + 1}}` },
        { tex: `${fracTex(n - 1, 2)} + \\frac{${c}}{${c + 1}} = ${fracTex(top, bottom)}` },
      );
    }
    return steps;
  },
};

/* ---------- the average smallest pick: equal gaps ---------- */

interface GapParams {
  k: number;
  n: number;
  /** Which pick in size order is asked: 1 is the smallest, k the largest. */
  j: number;
}

const gapAnswer = ({ k, n, j }: GapParams): Frac => [j * (n + 1), k + 1];

const gapWord = ({ k, j }: GapParams) => (j === k ? 'largest' : ORDINAL[j]);

const cmStGapMin: Generator<GapParams> = {
  id: 'cm-st-gap-min',
  sample(rng, difficulty) {
    if (difficulty >= 2) {
      const k = rng.int(3, 5);
      return { k, n: rng.int(10, 40), j: rng.int(2, k) };
    }
    return { k: rng.int(2, 4), n: rng.int(8, 40), j: 1 };
  },
  render(p) {
    const [top, bottom] = gapAnswer(p);
    return typed(
      [
        say(`${p.k} different whole numbers are picked at random from $1$ to $${p.n}$.`),
        say(`On average, what is the ${gapWord(p)} of them?`),
      ],
      fracAnswer(top, bottom),
      '\\text{average} =',
      FRACTION_KEYS,
    );
  },
  choices(p) {
    const { k, n, j } = p;
    return fracOptions(gapAnswer(p), [
      [j * n, k + 1],
      [j * (n + 1), k],
      [j * n, k],
      [n + 1, 2],
    ]);
  },
  solution(p) {
    const { k, n, j } = p;
    const [top, bottom] = gapAnswer(p);
    const steps: SolutionStep[] = [
      { text: `Put markers at $0$ and $${n + 1}$. The ${k} picks cut the stretch between them into $${k + 1}$ gaps, which add up to $${n + 1}$.` },
      { text: 'Every gap plays the same part (swapping two gaps gives another choice of picks, just as likely), so on average each gap is the same size:' },
      { tex: `\\frac{${n + 1}}{${k + 1}}` },
    ];
    steps.push(
      j === 1
        ? { text: 'The smallest pick is one gap along from $0$.' }
        : { text: `The ${gapWord(p)} pick is $${j}$ gaps along from $0$:` },
    );
    if (j > 1) steps.push({ tex: `${j} \\times \\frac{${n + 1}}{${k + 1}} = ${fracTex(top, bottom)}` });
    else if (gcd(top, bottom) > 1) steps.push({ tex: `\\frac{${n + 1}}{${k + 1}} = ${fracTex(top, bottom)}` });
    return steps;
  },
};

/* ================================================================
 * Lesson 5: Eliminating Choices
 * ================================================================ */

/* ---------- which is the product? last digits, then digit sums ---------- */

interface ProductParams {
  x: number;
  y: number;
  /** Distractors, all near the product. */
  others: number[];
  /** Difficulty 2: every option shares the last digit, so digit sums decide. */
  nines: boolean;
}

const cmStProductElim: Generator<ProductParams> = {
  id: 'cm-st-product-elim',
  sample(rng, difficulty) {
    const x = rng.int(1001, 9999);
    const y = rng.int(101, 999);
    const p = x * y;
    const others: number[] = [];
    if (difficulty >= 2) {
      while (others.length < 3) {
        const m = rng.sign() * rng.int(1, 40);
        const v = p + 10 * m;
        if (m % 9 === 0 || others.includes(v)) continue;
        others.push(v);
      }
      return { x, y, others, nines: true };
    }
    const lasts = rng.sample([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((u) => u !== p % 10), 3);
    for (const u of lasts) others.push(p - (p % 10) + u + 10 * rng.int(-30, 30));
    return { x, y, others, nines: false };
  },
  render(p) {
    const right = p.x * p.y;
    return choiceSlide(
      [say(`Which of these is $${p.x} \\times ${p.y}$? Decide without multiplying it all out.`)],
      num(right),
      p.others.map(num),
    );
  },
  solution(p) {
    const right = p.x * p.y;
    if (!p.nines) {
      return [
        { text: 'Only the last digits matter for the last digit:' },
        { tex: `${p.x % 10} \\times ${p.y % 10} = ${(p.x % 10) * (p.y % 10)}` },
        { text: `So the product ends in $${right % 10}$, and only $${right}$ does.` },
      ];
    }
    const rx = digitalRoot(p.x);
    const ry = digitalRoot(p.y);
    return [
      { text: `Every option ends in $${right % 10}$, so the last digit cannot decide. Use digit sums instead: a product's digit sum, taken down to one digit, matches the product of the factors' digit sums.` },
      { tex: `${p.x} \\to ${rx}, \\qquad ${p.y} \\to ${ry}` },
      { tex: `${rx} \\times ${ry} = ${rx * ry} \\to ${digitalRoot(rx * ry)}` },
      { text: 'Now the options:' },
      ...[right, ...p.others].sort((a, b) => a - b).map((v) => ({ tex: `${v} \\to ${digitalRoot(v)}` })),
      { text: `Only $${right}$ comes to $${digitalRoot(right)}$.` },
    ];
  },
};

/* ---------- which is a perfect square? ---------- */

interface SquareElimParams {
  r: number;
  others: number[];
  /** Difficulty 2: the others end in digits squares can end in, so digit sums decide. */
  nines: boolean;
}

const SQUARE_ROOTS = new Set([1, 4, 7, 9]);

const cmStSquareElim: Generator<SquareElimParams> = {
  id: 'cm-st-square-elim',
  sample(rng, difficulty) {
    const nines = difficulty >= 2;
    const r = nines ? rng.int(101, 300) : rng.int(32, 99);
    const sq = r * r;
    const others: number[] = [];
    while (others.length < 3) {
      const v = sq + rng.sign() * rng.int(3, nines ? 2 * r : r);
      if (others.includes(v) || isSquare(v)) continue;
      const last = v % 10;
      if (!nines && ![2, 3, 7, 8].includes(last)) continue;
      if (nines && (![1, 4, 6, 9].includes(last) || SQUARE_ROOTS.has(digitalRoot(v)))) continue;
      others.push(v);
    }
    return { r, others, nines };
  },
  render(p) {
    return choiceSlide([say('Exactly one of these is a perfect square. Which one?')], num(p.r * p.r), p.others.map(num));
  },
  solution(p) {
    const sq = p.r * p.r;
    if (!p.nines) {
      return [
        { text: 'A square ends in the same digit as the square of its last digit, and $0^2, 1^2, \\ldots, 9^2$ end in' },
        { tex: '0, 1, 4, 9, 6, 5, 6, 9, 4, 1' },
        { text: `So no square ends in $2$, $3$, $7$ or $8$. That rules out ${listed([...p.others].sort((a, b) => a - b).map((v) => `$${v}$`))}, leaving` },
        { tex: `${sq} = ${p.r}^2` },
      ];
    }
    return [
      { text: 'Every option ends in a digit a square can end in. Use digit sums, taken down to one digit: for a square they only ever come to $1$, $4$, $7$ or $9$.' },
      ...[sq, ...p.others].sort((a, b) => a - b).map((v) => ({ tex: `${v} \\to ${digitalRoot(v)}` })),
      { text: 'Only one option passes:' },
      { tex: `${sq} = ${p.r}^2` },
    ];
  },
};

/* ---------- remainders: test the options ---------- */

const MOD_PAIRS: [number, number][] = [
  [3, 4],
  [3, 5],
  [4, 5],
  [3, 7],
  [4, 7],
  [5, 7],
  [5, 8],
  [7, 8],
  [4, 9],
  [5, 9],
  [7, 9],
  [3, 8],
  [8, 9],
];

const MOD_TRIPLES: number[][] = [
  [3, 4, 5],
  [3, 5, 7],
  [4, 5, 7],
  [3, 4, 7],
];

interface RemainderParams {
  mods: number[];
  rems: number[];
  answer: number;
  others: number[];
}

const fits = (v: number, mods: number[], rems: number[]) => mods.filter((m, i) => v % m === rems[i]).length;

const cmStRemainderElim: Generator<RemainderParams> = {
  id: 'cm-st-remainder-elim',
  sample(rng, difficulty) {
    const mods = difficulty >= 2 ? rng.pick(MOD_TRIPLES) : rng.pick(MOD_PAIRS);
    const rems = mods.map((m) => rng.int(1, m - 1));
    const top = difficulty >= 2 ? 220 : 150;
    const all = range(20, top);
    const right = all.filter((v) => fits(v, mods, rems) === mods.length);
    const answer = rng.pick(right);
    const others: number[] = [];
    if (difficulty >= 2) {
      // Each distractor passes every test but one.
      const near = all.filter((v) => fits(v, mods, rems) === mods.length - 1);
      others.push(...rng.sample(near, 3));
    } else {
      // Two pass the first test only and one the second only: checking one is the trap.
      const firstOnly = all.filter((v) => v % mods[0] === rems[0] && v % mods[1] !== rems[1]);
      const secondOnly = all.filter((v) => v % mods[1] === rems[1] && v % mods[0] !== rems[0]);
      others.push(...rng.sample(firstOnly, 2), rng.pick(secondOnly));
    }
    return { mods, rems, answer, others };
  },
  render(p) {
    const conditions = p.mods.map((m, i) => `a remainder of ${p.rems[i]} when divided by ${m}`);
    return choiceSlide([say(`Which of these numbers leaves ${listed(conditions)}?`)], num(p.answer), p.others.map(num));
  },
  solution(p) {
    const steps: SolutionStep[] = [
      { text: `Rather than solve, test each option. The remainders on division by ${listed(p.mods.map(String))}:` },
    ];
    for (const v of [p.answer, ...p.others].sort((a, b) => a - b)) {
      steps.push({ tex: `${v}: \\ ${p.mods.map((m) => v % m).join(', ')}` });
    }
    steps.push({ text: `Only $${p.answer}$ gives $${p.rems.join(', ')}$.` });
    return steps;
  },
};

/* ---------- consecutive numbers from their product ---------- */

interface ConsecutiveParams {
  n: number;
  three: boolean;
}

const consProduct = ({ n, three }: ConsecutiveParams) => n * (n + 1) * (three ? n + 2 : 1);

const cmStConsecutiveProduct: Generator<ConsecutiveParams> = {
  id: 'cm-st-consecutive-product',
  sample(rng, difficulty) {
    return difficulty >= 2 ? { n: rng.int(11, 46), three: true } : { n: rng.int(21, 99), three: false };
  },
  render(p) {
    return typed(
      [say(`The product of ${p.three ? 'three' : 'two'} consecutive whole numbers is $${consProduct(p)}$. What is the ${p.three ? 'smallest' : 'smaller'} of them?`)],
      p.n,
      p.three ? '\\text{smallest} =' : '\\text{smaller} =',
    );
  },
  choices(p) {
    const N = consProduct(p);
    return numberOptions(p.n, [p.n + 1, p.n - 1, Math.round(p.three ? Math.cbrt(N) : Math.sqrt(N)), p.n + 2], 1, 1);
  },
  solution(p) {
    const { n } = p;
    const N = consProduct(p);
    if (!p.three) {
      return [
        { text: 'The two numbers sit either side of the square root, so find the squares nearby:' },
        { tex: `${n}^2 = ${n * n}, \\qquad ${n + 1}^2 = ${(n + 1) * (n + 1)}` },
        { text: `$${N}$ is between them, so the numbers are $${n}$ and $${n + 1}$. Check the last digit: $${n % 10} \\times ${(n + 1) % 10}$ ends in $${(n * (n + 1)) % 10}$, as $${N}$ does.` },
        { tex: `${n} \\times ${n + 1} = ${N}` },
      ];
    }
    const m = n + 1;
    return [
      { text: 'Three consecutive numbers multiply to just under the cube of the middle one, $m$:' },
      { tex: '(m - 1)m(m + 1) = m^3 - m' },
      { text: 'So try cubes:' },
      { tex: `${m}^3 = ${m ** 3}` },
      { text: `$${N}$ is just below it, so the middle number is $${m}$. Check:` },
      { tex: `${n} \\times ${n + 1} \\times ${n + 2} = ${N}` },
    ];
  },
};

/* ---------- a square root by elimination, the working as a table ---------- */

interface RootParams {
  r: number;
}

const rootTens = ({ r }: RootParams) => 10 * Math.floor(r / 10);

const cmStRootTable: Generator<RootParams> = {
  id: 'cm-st-root-table',
  sample(rng, difficulty) {
    for (;;) {
      const r = difficulty >= 2 ? rng.int(101, 299) : rng.int(31, 99);
      if (r % 5 !== 0) return { r };
    }
  },
  render(p) {
    const N = p.r * p.r;
    const t = rootTens(p);
    const mid = (t + 5) * (t + 5);
    const twin = t + 10 - (p.r % 10);
    return {
      kind: 'table',
      prompt: [
        say(`$${N}$ is a perfect square. Find its square root without a calculator.`),
        say('Fill in the tens below the root, the square of the number halfway to the next ten, and the root.'),
      ],
      columns: ['\\text{step}', '\\text{value}'],
      rows: [
        ['\\text{tens below}', null],
        ['(\\text{tens} + 5)^2', null],
        ['\\text{root}', null],
      ],
      bank: numberBank([t, mid, p.r], [twin, t + 10, (t + 10) * (t + 10), t * t, p.r + 1], 3),
      answer: [t, mid, p.r].map(num),
    };
  },
  solution(p) {
    const N = p.r * p.r;
    const t = rootTens(p);
    const u = p.r % 10;
    const small = Math.min(u, 10 - u);
    const mid = (t + 5) * (t + 5);
    return [
      { text: 'The squares of the tens either side:' },
      { tex: `${t}^2 = ${t * t}, \\qquad ${t + 10}^2 = ${(t + 10) * (t + 10)}` },
      { text: `$${N}$ ends in $${N % 10}$, and only roots ending in $${small}$ or $${10 - small}$ give that, so the root is $${t + small}$ or $${t + 10 - small}$. The square halfway decides:` },
      { tex: `${t + 5}^2 = ${mid}` },
      { text: `$${N}$ is ${N < mid ? 'below' : 'above'} it, so the root is $${p.r}$.` },
    ];
  },
};

/* ================================================================
 * Lesson 6: Simplifications
 * ================================================================ */

/* ---------- a fraction of huge powers: take out the smallest ---------- */

interface PowerFracParams {
  /** The base the terms are written in, and the base they are all powers of. */
  big: number;
  small: number;
  E: number;
  /** Exponents over the base power, each as a power of `small`: top pair, bottom pair. */
  top: [number, number];
  bottom: [number, number];
  topPlus: boolean;
  bottomPlus: boolean;
  mixed: boolean;
}

function powerFracValue(p: PowerFracParams): Frac {
  const m = Math.min(...p.top, ...p.bottom);
  const t = p.small ** (p.top[0] - m) + (p.topPlus ? 1 : -1) * p.small ** (p.top[1] - m);
  const b = p.small ** (p.bottom[0] - m) + (p.bottomPlus ? 1 : -1) * p.small ** (p.bottom[1] - m);
  return [t, b];
}

/** A term as displayed: difficulty 2 writes the even powers as powers of `big`. */
function powerTerm(p: PowerFracParams, e: number, asBig: boolean): string {
  if (!p.mixed) return `${p.small}^{${p.E + e}}`;
  return asBig ? `${p.big}^{${p.E + e / 2}}` : `${p.small}^{${2 * p.E + e}}`;
}

const powerFracTex = (p: PowerFracParams) =>
  `\\frac{${powerTerm(p, p.top[0], true)} ${p.topPlus ? '+' : '-'} ${powerTerm(p, p.top[1], false)}}{${powerTerm(p, p.bottom[0], false)} ${p.bottomPlus ? '+' : '-'} ${powerTerm(p, p.bottom[1], true)}}`;

const cmStPowerFraction: Generator<PowerFracParams> = {
  id: 'cm-st-power-fraction',
  sample(rng, difficulty) {
    for (;;) {
      if (difficulty >= 2) {
        const [big, small] = rng.pick([
          [4, 2],
          [9, 3],
        ] as const);
        const lim = small === 2 ? 3 : 2;
        // Terms written as powers of `big` need even exponents over small^(2E).
        const top: [number, number] = [2 * rng.int(0, lim), rng.int(0, 2 * lim)];
        const bottom: [number, number] = [rng.int(0, 2 * lim), 2 * rng.int(0, lim)];
        const p: PowerFracParams = { big, small, E: rng.int(1000, 1030), top, bottom, topPlus: rng.chance(0.5), bottomPlus: rng.chance(0.5), mixed: true };
        if (ok(p)) return p;
        continue;
      }
      const small = rng.pick([2, 3, 5]);
      const lim = small === 5 ? 2 : 3;
      const top: [number, number] = [rng.int(0, lim), rng.int(0, lim)];
      const bottom: [number, number] = [rng.int(0, lim), rng.int(0, lim)];
      const p: PowerFracParams = { big: small, small, E: rng.int(2000, 2040), top, bottom, topPlus: rng.chance(0.5), bottomPlus: rng.chance(0.5), mixed: false };
      if (ok(p)) return p;
    }
    function ok(p: PowerFracParams): boolean {
      if (p.top[0] === p.top[1] || p.bottom[0] === p.bottom[1]) return false;
      // A minus sign only between a bigger term and a smaller one.
      if (!p.topPlus && p.top[0] < p.top[1]) return false;
      if (!p.bottomPlus && p.bottom[0] < p.bottom[1]) return false;
      const [t, b] = powerFracValue(p);
      if (t <= 0 || b <= 0 || t === b) return false;
      return t / gcd(t, b) <= 200 && b / gcd(t, b) <= 200;
    }
  },
  render(p) {
    const [t, b] = powerFracValue(p);
    return typed([say('Simplify fully.'), show(powerFracTex(p))], fracAnswer(t, b), '\\text{value} =', FRACTION_KEYS);
  },
  choices(p) {
    const [t, b] = powerFracValue(p);
    const m = Math.min(...p.top, ...p.bottom);
    const s = p.small;
    const flipTop = s ** (p.top[0] - m) + (p.topPlus ? -1 : 1) * s ** (p.top[1] - m);
    const flipBottom = s ** (p.bottom[0] - m) + (p.bottomPlus ? -1 : 1) * s ** (p.bottom[1] - m);
    return fracOptions(
      [t, b],
      [
        [b, t],
        [flipTop, b],
        [t, flipBottom],
        [s ** Math.max(0, p.top[0] - p.bottom[0]), s ** Math.max(0, p.bottom[0] - p.top[0])],
      ],
    );
  },
  solution(p) {
    const m = Math.min(...p.top, ...p.bottom);
    const s = p.small;
    const [t, b] = powerFracValue(p);
    const common = p.mixed ? `${s}^{${2 * p.E + m}}` : `${s}^{${p.E + m}}`;
    const val = (e: number) => s ** (e - m);
    const steps: SolutionStep[] = [];
    if (p.mixed) {
      steps.push(
        { text: `First write everything as a power of $${s}$, since $${p.big} = ${s}^2$:` },
        { tex: `${p.big}^{n} = ${s}^{2n}` },
      );
    }
    steps.push(
      { text: `Take out the smallest power, $${common}$, from the top and the bottom:` },
      { tex: `\\frac{${common}(${val(p.top[0])} ${p.topPlus ? '+' : '-'} ${val(p.top[1])})}{${common}(${val(p.bottom[0])} ${p.bottomPlus ? '+' : '-'} ${val(p.bottom[1])})}` },
      {
        tex:
          b === 1 ? `= ${t}` : `= \\frac{${t}}{${b}}${gcd(t, b) > 1 ? ` = ${fracTex(t, b)}` : ''}`,
      },
    );
    return steps;
  },
};

/* ---------- name the number ---------- */

interface NameParams {
  x: number;
  /** Offsets of the four factors from x, as the first product then the second. */
  offs: [number, number, number, number];
  /** Difficulty 1: x is the middle of both products. Difficulty 2: the pairs share a sum. */
  centred: boolean;
}

const nameValue = ({ offs: [a, b, c, d] }: NameParams) => a * b - c * d;

const nameTex = ({ x, offs: [a, b, c, d] }: NameParams) => `${x + a} \\times ${x + b} - ${x + c} \\times ${x + d}`;

const cmStNameNumber: Generator<NameParams> = {
  id: 'cm-st-name-number',
  sample(rng, difficulty) {
    const x = rng.int(1000, 9999);
    if (difficulty >= 2) {
      for (;;) {
        const a = rng.int(0, 3);
        const b = a + rng.int(3, 11);
        const c = rng.int(a + 1, Math.floor((a + b) / 2));
        const d = a + b - c;
        const outerFirst = rng.chance(0.5);
        const offs: [number, number, number, number] = outerFirst ? [a, b, c, d] : [c, d, a, b];
        const p = { x, offs, centred: false };
        if (nameValue(p) !== 0) return p;
      }
    }
    const [a, b] = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 2);
    return { x, offs: [-a, a, -b, b], centred: true };
  },
  render(p) {
    return typed([say('Work it out without a calculator.'), show(nameTex(p))], nameValue(p), '\\text{value} =');
  },
  choices(p) {
    const right = nameValue(p);
    const [a, b, c, d] = p.offs;
    return numberOptions(right, [-right, a * a + c * c, (b - a) - (d - c), 2 * right], 1, -1e6);
  },
  solution(p) {
    const [a, b, c, d] = p.offs;
    if (p.centred) {
      return [
        { text: `Call the middle number $x = ${p.x}$. Each product is a difference of two squares:` },
        { tex: `${p.x + a} \\times ${p.x + b} = (x - ${b})(x + ${b}) = {x^2 - ${b * b}}` },
        { tex: `${p.x + c} \\times ${p.x + d} = (x - ${d})(x + ${d}) = {x^2 - ${d * d}}` },
        { text: 'The $x^2$ cancels:' },
        { tex: `(x^2 - ${b * b}) - (x^2 - ${d * d}) = ${nameValue(p)}` },
      ];
    }
    const low = Math.min(a, c);
    const x = p.x + low;
    const sh = (v: number) => (v === low ? 'x' : `(x + ${v - low})`);
    const expand = (u: number, v: number) => {
      const s = u + v - 2 * low;
      const k = (u - low) * (v - low);
      return `x^2 + ${s}x${k ? ` + ${k}` : ''}`;
    };
    return [
      { text: `Both pairs add to the same total. Call the smallest number $x = ${x}$:` },
      { tex: `${p.x + a} \\times ${p.x + b} = ${sh(a)}${sh(b)} = {${expand(a, b)}}` },
      { tex: `${p.x + c} \\times ${p.x + d} = ${sh(c)}${sh(d)} = {${expand(c, d)}}` },
      { text: 'The $x^2$ and $x$ terms cancel:' },
      { tex: `(${expand(a, b)}) - (${expand(c, d)}) = ${nameValue(p)}` },
    ];
  },
};

/* ---------- a + b and ab: never solve for a and b ---------- */

interface SymParams {
  s: number;
  p: number;
  /** recip: 1/a + 1/b. ratio: a/b + b/a. squares: a² + b² (tiles). cubes: a³ + b³ (tiles). */
  ask: 'recip' | 'ratio' | 'squares' | 'cubes';
}

function sampleSym(rng: Rng, ask: SymParams['ask']): SymParams {
  for (;;) {
    const s = rng.int(3, ask === 'cubes' ? 10 : 14);
    const p = rng.int(1, Math.floor((s * s - 1) / 4));
    // a and b real but not whole, so solving for them is the slow way.
    if (isSquare(s * s - 4 * p)) continue;
    if (ask === 'cubes' && s * s === 6 * p) continue;
    if (ask === 'recip' && gcd(s, p) === p) continue;
    return { s, p, ask };
  }
}

const symGiven = ({ s, p }: SymParams) => show(`a + b = ${s}, \\qquad ab = ${p}`);

const cmStSymSum: Generator<SymParams> = {
  id: 'cm-st-sym-sum',
  sample(rng, difficulty) {
    return sampleSym(rng, difficulty >= 2 ? 'ratio' : 'recip');
  },
  render(q) {
    const { s, p } = q;
    if (q.ask === 'recip') {
      return typed([say('Two numbers $a$ and $b$ have'), symGiven(q), say('What is $\\frac{1}{a} + \\frac{1}{b}$?')], fracAnswer(s, p), '\\frac{1}{a} + \\frac{1}{b} =', FRACTION_KEYS);
    }
    return typed([say('Two numbers $a$ and $b$ have'), symGiven(q), say('What is $\\frac{a}{b} + \\frac{b}{a}$?')], fracAnswer(s * s - 2 * p, p), '\\frac{a}{b} + \\frac{b}{a} =', FRACTION_KEYS);
  },
  choices(q) {
    const { s, p } = q;
    if (q.ask === 'recip') return fracOptions([s, p], [[p, s], [s, 2 * p], [2, s], [s + 2, p]]);
    return fracOptions([s * s - 2 * p, p], [[s * s, p], [s * s - 2 * p, p * p], [s * s - 4 * p, p], [s * s + 2 * p, p]]);
  },
  solution(q) {
    const { s, p } = q;
    if (q.ask === 'recip') {
      return [
        { text: 'Put the two fractions over a common denominator, and the answer is in terms of $a + b$ and $ab$ alone:' },
        { tex: `\\frac{1}{a} + \\frac{1}{b} = \\frac{a + b}{ab}` },
        { tex: `= ${fracTex(s, p)}` },
      ];
    }
    return [
      { text: 'Over a common denominator the top is $a^2 + b^2$, which comes from squaring $a + b$:' },
      { tex: `\\frac{a}{b} + \\frac{b}{a} = \\frac{a^2 + b^2}{ab}` },
      { tex: 'a^2 + b^2 = (a + b)^2 - 2ab' },
      { tex: `= ${s * s} - ${2 * p} = ${s * s - 2 * p}` },
      { tex: `\\frac{a^2 + b^2}{ab} = \\frac{${s * s - 2 * p}}{${p}}${gcd(s * s - 2 * p, p) > 1 || p === 1 ? ` = ${fracTex(s * s - 2 * p, p)}` : ''}` },
    ];
  },
};

const cmStSymSumTiles: Generator<SymParams> = {
  id: 'cm-st-sym-sum-tiles',
  sample(rng, difficulty) {
    return sampleSym(rng, difficulty >= 2 ? 'cubes' : 'squares');
  },
  render(q) {
    const { s, p } = q;
    if (q.ask === 'cubes') {
      const values = [s ** 3, 3 * p * s, s ** 3 - 3 * p * s];
      return {
        kind: 'tiles',
        prompt: [say('Two numbers $a$ and $b$ have'), symGiven(q), say('Fill in the working for $a^3 + b^3$ using $(a + b)^3 - 3ab(a + b)$.')],
        template: 'a^3 + b^3 = {0} - {1} = {2}',
        bank: numberBank(values, [3 * p, s ** 3 - 3 * p, s ** 3 - p * s, 3 * s, s ** 3 + 3 * p * s], 3),
        answer: values.map(num),
      };
    }
    const values = [s * s, 2 * p, s * s - 2 * p];
    return {
      kind: 'tiles',
      prompt: [say('Two numbers $a$ and $b$ have'), symGiven(q), say('Fill in the working for $a^2 + b^2$ using $(a + b)^2 - 2ab$.')],
      template: 'a^2 + b^2 = {0} - {1} = {2}',
      bank: numberBank(values, [p, s * s - p, 2 * s, s * s + 2 * p, s * s - 4 * p], 3),
      answer: values.map(num),
    };
  },
  solution(q) {
    const { s, p } = q;
    if (q.ask === 'cubes') {
      return [
        { text: 'Cubing $a + b$ gives $a^3 + b^3$ plus the extra terms' },
        { tex: '3a^2b + 3ab^2 = 3ab(a + b)' },
        { text: 'so' },
        { tex: `a^3 + b^3 = (a + b)^3 - 3ab(a + b)` },
        { tex: `= ${s}^3 - 3 \\times ${p} \\times ${s}` },
        { tex: `= ${s ** 3} - ${3 * p * s} = ${s ** 3 - 3 * p * s}` },
      ];
    }
    return [
      { text: 'Squaring $a + b$ gives $a^2 + b^2$ plus the extra term $2ab$:' },
      { tex: `a^2 + b^2 = (a + b)^2 - 2ab` },
      { tex: `= ${s * s} - ${2 * p} = ${s * s - 2 * p}` },
    ];
  },
};

export const contestStrategiesGenerators = [
  cmStTriangles,
  cmStAbsRegions,
  cmStCaseTable,
  cmStSquareEnds,
  cmStSocksTable,
  cmStCups,
  cmStBoard,
  cmStPairSum,
  cmStPatternTable,
  cmStNthTerm,
  cmStAltSquares,
  cmStJosephus,
  cmStRiver,
  cmStRiverTiles,
  cmStPairFunction,
  cmStGapMin,
  cmStProductElim,
  cmStSquareElim,
  cmStRemainderElim,
  cmStConsecutiveProduct,
  cmStRootTable,
  cmStPowerFraction,
  cmStNameNumber,
  cmStSymSum,
  cmStSymSumTiles,
];
