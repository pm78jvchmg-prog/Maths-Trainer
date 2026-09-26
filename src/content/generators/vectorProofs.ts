/**
 * Vector proofs in shapes (Vectors, level 16, `vm-l16`).
 *
 * The GCSE "show that" in vector geometry: two vectors named $\mathbf{a}$ and
 * $\mathbf{b}$, no coordinates, and every other vector written in terms of
 * them. Each proof has the same spine — write both vectors in $\mathbf{a}$ and
 * $\mathbf{b}$, spot that one is a multiple of the other, and say what that
 * means — so the questions ask for one piece of it at a time: a route through
 * the shape (typed), the multiple (tiles), the order of the steps (order), or
 * the whole argument as a walk of decisions (flow). Never free text.
 *
 * Every point in a scene is held as its position from the scene's origin, a
 * pair of fractions (the coefficients of $\mathbf{a}$ and $\mathbf{b}$), so a
 * vector between two points is one subtraction and the worked solution always
 * reads "destination minus start", the method `vm-l4` taught.
 *
 * The figures are sketches drawn from those same positions. Their labels are
 * plain SVG text — a bold letter for a vector — never KaTeX.
 */
import type { Block, ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { hashSeed } from '../../engine/rng';
import { options } from '../choiceVariant';
import { gcd } from './format';
import { orderBank } from './proofOrder';

/* ---------- fractions ---------- */

interface Ratio {
  n: number;
  d: number;
}

function ratio(n: number, d = 1): Ratio {
  const g = gcd(n, d) || 1;
  const sign = d < 0 ? -1 : 1;
  const top = (sign * n) / g;
  return { n: top === 0 ? 0 : top, d: (sign * d) / g };
}

const R = ratio;
const rAdd = (p: Ratio, q: Ratio) => ratio(p.n * q.d + q.n * p.d, p.d * q.d);
const rNeg = (p: Ratio) => ratio(-p.n, p.d);
const rSub = (p: Ratio, q: Ratio) => rAdd(p, rNeg(q));
const rMul = (p: Ratio, q: Ratio) => ratio(p.n * q.n, p.d * q.d);
const rDiv = (p: Ratio, q: Ratio) => ratio(p.n * q.d, p.d * q.n);
const rEq = (p: Ratio, q: Ratio) => p.n === q.n && p.d === q.d;
const rVal = (p: Ratio) => p.n / p.d;
const rAbs = (p: Ratio) => ratio(Math.abs(p.n), p.d);

/** A fraction as the learner reads it: `-\frac{1}{3}`, `2`, never `\frac{2}{1}`. */
function ratioTex({ n, d }: Ratio): string {
  if (d === 1) return `${n}`;
  return `${n < 0 ? '-' : ''}\\frac{${Math.abs(n)}}{${d}}`;
}

/** The same fraction for mathjs, bracketed so nothing can bind into it. */
function ratioAnswer({ n, d }: Ratio): string {
  return `(${n}/${d})`;
}

/** A positive size in front of a symbol: `\frac{1}{2}\mathbf{a}`, `\mathbf{a}`. */
function termTex(size: Ratio, symbol: string): string {
  if (size.n === size.d) return symbol;
  return `${ratioTex(size)}${symbol}`;
}

/** A signed multiple of a symbol: `-2\overrightarrow{AB}`, `\overrightarrow{AB}`. */
function kTex(k: Ratio, symbol: string): string {
  return `${k.n < 0 ? '-' : ''}${termTex(rAbs(k), symbol)}`;
}

/* ---------- combinations of a and b ---------- */

interface V {
  a: Ratio;
  b: Ratio;
}

const vec = (a: number | Ratio, b: number | Ratio): V => ({
  a: typeof a === 'number' ? R(a) : a,
  b: typeof b === 'number' ? R(b) : b,
});
const vAdd = (u: V, v: V): V => ({ a: rAdd(u.a, v.a), b: rAdd(u.b, v.b) });
const vSub = (u: V, v: V): V => ({ a: rSub(u.a, v.a), b: rSub(u.b, v.b) });
const vScale = (u: V, k: Ratio): V => ({ a: rMul(u.a, k), b: rMul(u.b, k) });
const vNeg = (u: V): V => vScale(u, R(-1));
const vEq = (u: V, v: V) => rEq(u.a, v.a) && rEq(u.b, v.b);
const vZero = (u: V) => u.a.n === 0 && u.b.n === 0;

/** A vector in a subtraction: bracketed only when it has two terms, or is subtracted and negative. */
function bk(u: V, subtracted: boolean): string {
  const t = vt(u);
  const twoTerms = u.a.n !== 0 && u.b.n !== 0;
  return twoTerms || (subtracted && t.startsWith('-')) ? `\\left(${t}\\right)` : t;
}

/** `λa + μb` as written by hand: a one is implied, a zero vanishes, a minus subtracts. */
function vt({ a, b }: V): string {
  const parts: string[] = [];
  if (a.n !== 0) parts.push(`${a.n < 0 ? '-' : ''}${termTex(rAbs(a), '\\mathbf{a}')}`);
  if (b.n !== 0) {
    const body = termTex(rAbs(b), '\\mathbf{b}');
    if (parts.length === 0) parts.push(`${b.n < 0 ? '-' : ''}${body}`);
    else parts.push(`${b.n < 0 ? '-' : '+'} ${body}`);
  }
  return parts.length === 0 ? '\\mathbf{0}' : parts.join(' ');
}

/** The same combination for mathjs, in the two symbols the keypad offers. */
function vAnswer({ a, b }: V): string {
  return `${ratioAnswer(a)}*a + ${ratioAnswer(b)}*b`;
}

/** The k with u = k v, or undefined when they are not parallel. */
function factorOf(u: V, v: V): Ratio | undefined {
  if (vZero(v) || vZero(u)) return undefined;
  const k = v.a.n !== 0 ? rDiv(u.a, v.a) : rDiv(u.b, v.b);
  return vEq(u, vScale(v, k)) ? k : undefined;
}

/** Combinations a slip produces, none equal to the right one or zero. */
function vectorSlips(v: V, extra: V[] = []): V[] {
  const out: V[] = [];
  for (const c of [
    ...extra,
    vNeg(v),
    { a: v.b, b: v.a },
    { a: rNeg(v.a), b: v.b },
    { a: v.a, b: rNeg(v.b) },
    vScale(v, R(2)),
    vScale(v, R(1, 2)),
  ]) {
    if (vZero(c) || vEq(c, v) || out.some((o) => vEq(o, c))) continue;
    out.push(c);
  }
  return out.slice(0, 3);
}

function vectorChoices(v: V, extra: V[] = []): ChoiceOption[] {
  return options(
    { tex: vt(v), answer: vAnswer(v) },
    ...vectorSlips(v, extra).map((s) => ({ tex: vt(s), answer: vAnswer(s) })),
  );
}

/** `a` and `b` for the answer box, with the brackets and fractions a combination needs. */
const PATH_KEYS: KeypadKey[] = [
  { insert: 'a', tex: true },
  { insert: 'b', tex: true },
  { insert: '(' },
  { insert: ')' },
  { insert: '/' },
];

const FRACTION_KEYS: KeypadKey[] = [{ insert: '/' }];

/** A well-mixed index in [0, n) from a key: FNV alone keeps its low bits too alike. */
function spread(key: string, n: number): number {
  let h = hashSeed(key);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) % n;
}

/** Mirrors the rotation `choiceVariant` applies to a derived choice slide. */
function rotationOf(opts: ChoiceOption[]): number {
  let hash = 0;
  for (const option of opts) {
    for (let i = 0; i < option.tex.length; i += 1) {
      hash = (hash * 31 + option.tex.charCodeAt(i)) | 0;
    }
  }
  return Math.abs(hash) % opts.length;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, idx) =>
    permutations([...items.slice(0, idx), ...items.slice(idx + 1)]).map((rest) => [item, ...rest]),
  );
}

/**
 * Options ordered so the derived choice slide's rotation lands the answer
 * where the question's own key says, spreading it over every slot while one
 * question still renders one way. As `steered` in vectors.ts.
 */
function steer(opts: ChoiceOption[], key: string): ChoiceOption[] {
  const target = spread(key, opts.length);
  for (const order of permutations(opts)) {
    const at = (order.findIndex((o) => o.correct) - rotationOf(order) + order.length) % order.length;
    if (at === target) return order;
  }
  return opts;
}

/** A fixed turn of a list, from a key, so one question always renders one way. */
function turned<T>(items: T[], key: string): T[] {
  const turn = spread(key, items.length);
  return [...items.slice(turn), ...items.slice(0, turn)];
}

/** Native choice options with the answer placed by the question's own salt. */
function placed(correct: string, wrong: string[], key: string): { options: { id: string; label: string; tex: boolean }[]; correctId: string } {
  const rest = [...new Set(wrong)].filter((w) => w !== correct);
  const all = [correct, ...rest];
  const at = spread(key, all.length);
  const ordered = [...rest.slice(0, at), correct, ...rest.slice(at)];
  return {
    options: ordered.map((label, idx) => ({ id: `o${idx}`, label, tex: true })),
    correctId: `o${at}`,
  };
}

/** A tile bank: the answer with its repeats, then spare values, sorted by size. */
function ratioBank(answer: Ratio[], wrong: Ratio[]): string[] {
  const needed = new Set(answer.map(ratioTex));
  const extras: Ratio[] = [];
  const seen = new Set<string>();
  const offer = (r: Ratio) => {
    const tex = ratioTex(r);
    if (needed.has(tex) || seen.has(tex)) return;
    seen.add(tex);
    extras.push(r);
  };
  wrong.forEach(offer);
  for (const r of [R(1), R(-1), R(1, 2), R(2), R(-1, 2), R(3)]) {
    if (extras.length >= 2) break;
    offer(r);
  }
  return [...answer, ...extras].sort((p, q) => rVal(p) - rVal(q)).map(ratioTex);
}

/** Whole-number tiles, the answer's with repeats and at least two spares. */
function wholeBank(answer: number[], wrong: number[]): string[] {
  const needed = new Set(answer);
  const extras: number[] = [];
  for (const w of [...wrong, 1, 2, 3, 4, 5, 6, 7]) {
    if (extras.length >= 2) break;
    if (w <= 0 || needed.has(w) || extras.includes(w)) continue;
    extras.push(w);
  }
  return [...answer, ...extras].sort((p, q) => p - q).map(String);
}

/** How the length of k·UV compares with UV, in words. */
function lengthWords(k: Ratio): string {
  const m = rAbs(k);
  let words: string;
  if (m.d === 1) words = m.n === 2 ? 'twice as long' : `${m.n} times as long`;
  else if (m.n === 1 && m.d <= 5) words = `${['', '', 'half', 'a third', 'a quarter', 'a fifth'][m.d]} as long`;
  else words = `$${ratioTex(m)}$ times as long`;
  return k.n < 0 ? `${words}, pointing the opposite way` : words;
}

/* ---------- figures ---------- */

type P2 = [number, number];

interface Figure {
  dots: { name: string; at: P2 }[];
  lines?: { from: P2; to: P2; dashed?: boolean }[];
  arrows?: { from: P2; to: P2; label: string }[];
  /** A segment carrying `count` equal-length marks at its middle. */
  ticks?: { from: P2; to: P2; count: number }[];
  caption?: string[];
  aria: string;
}

/** A vector's label in SVG text: the number plain, the letter bold. */
export function vecLabel(c: number, letter: 'a' | 'b'): string {
  return `${c === 1 ? '' : c === -1 ? '-' : c}<tspan font-weight="bold">${letter}</tspan>`;
}

/**
 * A sketch of the shape, to scale with the question's own positions.
 *
 * Point names sit outside the shape (away from the middle of the dots) and
 * vector labels inside, so a midpoint's name and the label of the side it
 * halves never land on each other.
 */
export function figureSvg(fig: Figure): string {
  const lines = fig.lines ?? [];
  const arrows = fig.arrows ?? [];
  const ticks = fig.ticks ?? [];
  const caption = fig.caption ?? [];
  const pts = [...fig.dots.map((d) => d.at), ...lines.flatMap((l) => [l.from, l.to]), ...arrows.flatMap((a) => [a.from, a.to])];
  const minX = Math.min(...pts.map((p) => p[0]));
  const maxX = Math.max(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1]));
  const maxY = Math.max(...pts.map((p) => p[1]));
  const w = Math.max(maxX - minX, 1);
  const h = Math.max(maxY - minY, 1);
  const scale = Math.min(220 / w, 150 / h);
  const pad = 26;
  const X = (p: P2) => pad + (p[0] - minX) * scale;
  const Y = (p: P2) => pad + (maxY - p[1]) * scale;
  const width = w * scale + 2 * pad;
  const height = h * scale + 2 * pad + caption.length * 18;
  const f = (v: number) => v.toFixed(1);
  const cx = fig.dots.reduce((s, d) => s + X(d.at), 0) / fig.dots.length;
  const cy = fig.dots.reduce((s, d) => s + Y(d.at), 0) / fig.dots.length;

  const parts: string[] = [
    `<svg viewBox="0 0 ${f(width)} ${f(height)}" width="100%" style="max-width:280px" role="img" aria-label="${fig.aria}">`,
  ];
  for (const l of lines) {
    parts.push(
      `<line x1="${f(X(l.from))}" y1="${f(Y(l.from))}" x2="${f(X(l.to))}" y2="${f(Y(l.to))}" stroke="currentColor" stroke-width="1.3"${l.dashed ? ' stroke-dasharray="5 4"' : ''} opacity="0.8" />`,
    );
  }
  for (const t of ticks) {
    const x1 = X(t.from);
    const y1 = Y(t.from);
    const x2 = X(t.to);
    const y2 = Y(t.to);
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    for (let i = 0; i < t.count; i += 1) {
      const off = (i - (t.count - 1) / 2) * 4;
      const mx = (x1 + x2) / 2 + ux * off;
      const my = (y1 + y2) / 2 + uy * off;
      parts.push(
        `<line x1="${f(mx - uy * 6)}" y1="${f(my + ux * 6)}" x2="${f(mx + uy * 6)}" y2="${f(my - ux * 6)}" stroke="currentColor" stroke-width="1.5" />`,
      );
    }
  }
  for (const a of arrows) {
    const x1 = X(a.from);
    const y1 = Y(a.from);
    const x2 = X(a.to);
    const y2 = Y(a.to);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    // The head and label go where they are furthest from any point on the
    // arrow (its ends included), so a midpoint never sits under the head.
    const len2 = (x2 - x1) ** 2 + (y2 - y1) ** 2 || 1;
    const marks: P2[] = [
      ...fig.dots.map((d) => d.at),
      ...ticks.map((t): P2 => [(t.from[0] + t.to[0]) / 2, (t.from[1] + t.to[1]) / 2]),
    ];
    const along = marks
      .map((p) => {
        const t = ((X(p) - x1) * (x2 - x1) + (Y(p) - y1) * (y2 - y1)) / len2;
        const off = Math.abs((X(p) - x1) * (y2 - y1) - (Y(p) - y1) * (x2 - x1)) / Math.sqrt(len2);
        return off < 3 ? t : undefined;
      })
      .filter((t): t is number => t !== undefined);
    const stops = [0, 1, ...along];
    const best = [0.5, 0.4, 0.6, 0.3, 0.7, 0.35, 0.65].reduce((keep, t) =>
      Math.min(...stops.map((s) => Math.abs(s - t))) > Math.min(...stops.map((s) => Math.abs(s - keep))) + 0.02 ? t : keep,
    );
    const mx = x1 + (x2 - x1) * best;
    const my = y1 + (y2 - y1) * best;
    parts.push(
      `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="currentColor" stroke-width="2" class="plot-accent" />`,
    );
    for (const turn of [0.45, -0.45]) {
      parts.push(
        `<line x1="${f(mx + 5 * Math.cos(angle))}" y1="${f(my + 5 * Math.sin(angle))}" x2="${f(mx + 5 * Math.cos(angle) - 9 * Math.cos(angle + turn))}" y2="${f(my + 5 * Math.sin(angle) - 9 * Math.sin(angle + turn))}" stroke="currentColor" stroke-width="2" class="plot-accent" stroke-linecap="round" />`,
      );
    }
    // The label goes on the side facing the middle of the shape.
    let px = -Math.sin(angle);
    let py = Math.cos(angle);
    if (px * (cx - mx) + py * (cy - my) < 0) {
      px = -px;
      py = -py;
    }
    parts.push(
      `<text x="${f(mx + px * 15)}" y="${f(my + py * 15)}" dy="0.35em" font-size="14" text-anchor="middle" fill="currentColor">${a.label}</text>`,
    );
  }
  for (const d of fig.dots) {
    const x = X(d.at);
    const y = Y(d.at);
    let dx = x - cx;
    let dy = y - cy;
    const len = Math.hypot(dx, dy);
    if (len < 4) {
      dx = 0.6;
      dy = -0.8;
    } else {
      dx /= len;
      dy /= len;
    }
    parts.push(`<circle cx="${f(x)}" cy="${f(y)}" r="3" fill="currentColor" />`);
    parts.push(
      `<text x="${f(x + dx * 15)}" y="${f(y + dy * 15)}" dy="0.35em" font-size="14" font-style="italic" text-anchor="middle" fill="currentColor">${d.name}</text>`,
    );
  }
  caption.forEach((line, idx) => {
    parts.push(
      `<text x="${f(width / 2)}" y="${f(h * scale + 2 * pad + idx * 18 + 4)}" font-size="13" text-anchor="middle" fill="currentColor">${line}</text>`,
    );
  });
  parts.push('</svg>');
  return parts.join('');
}

/* ---------- scenes: named points with positions ---------- */

interface Pt {
  name: string;
  pos: V;
  /** How the route from the origin is found, before it is tidied. TeX. */
  derive?: string;
}

const arrow = (from: string, to: string) => `\\overrightarrow{${from}${to}}`;

/** The route from the origin to a point, and what it comes to, a line each. */
function posLines(origin: string, p: Pt): SolutionStep[] {
  const head = arrow(origin, p.name);
  return p.derive
    ? [{ tex: `${head} = ${p.derive}` }, { tex: `${head} = ${vt(p.pos)}` }]
    : [{ tex: `${head} = ${vt(p.pos)}` }];
}

/** The vector from one point to another. */
const between = (x: Pt, y: Pt): V => vSub(y.pos, x.pos);

/** Worked lines for XY: each end from the origin, then destination minus start. */
function routeLines(origin: string, x: Pt, y: Pt): SolutionStep[] {
  const target = arrow(x.name, y.name);
  if (x.name === origin) return posLines(origin, y);
  const lines: SolutionStep[] = [];
  for (const p of [x, y]) if (p.name !== origin) lines.push(...posLines(origin, p));
  if (y.name === origin) {
    lines.push({ tex: `${target} = -${arrow(origin, x.name)} = ${vt(vNeg(x.pos))}` });
  } else {
    lines.push({ tex: `${target} = ${arrow(origin, y.name)} - ${arrow(origin, x.name)}` });
    const subtracted = `${bk(y.pos, false)} - ${bk(x.pos, true)}`;
    lines.push({ tex: `${target} = ${subtracted}` });
    // Nothing to simplify when the subtraction already reads as the answer.
    if (subtracted !== vt(between(x, y))) lines.push({ tex: `${target} = ${vt(between(x, y))}` });
  }
  return lines;
}

function routeSolution(origin: string, x: Pt, y: Pt, intro: SolutionStep[] = []): SolutionStep[] {
  return [
    ...intro,
    {
      text:
        x.name === origin
          ? `Find the route from $${origin}$ to $${y.name}$ through vectors you know.`
          : `Write each end as a journey from $${origin}$. Then $${arrow(x.name, y.name)}$ is destination minus start.`,
    },
    ...routeLines(origin, x, y),
  ];
}

/** A question about one vector in a scene: find it in terms of a and b. */
function routeSlide(prompt: Block[], x: Pt, y: Pt): Slide {
  return {
    kind: 'expression',
    prompt: [
      ...prompt,
      { kind: 'prose', text: `Find $${arrow(x.name, y.name)}$ in terms of $\\mathbf{a}$ and $\\mathbf{b}$.` },
    ],
    lead: `${arrow(x.name, y.name)} =`,
    keypad: PATH_KEYS,
    answer: vAnswer(between(x, y)),
    domain: 'real',
    mode: 'exact',
  };
}

/** Every ordered pair of roles, less the given ones, keeping those `keep` allows. */
function pairsOf<Role extends string>(roles: Role[], given: string[], keep: (x: Role, y: Role) => boolean): [Role, Role][] {
  const out: [Role, Role][] = [];
  for (const x of roles) {
    for (const y of roles) {
      if (x === y || given.includes(`${x}${y}`) || given.includes(`${y}${x}`)) continue;
      if (keep(x, y)) out.push([x, y]);
    }
  }
  return out;
}

/* ---------- a parallel proof: shared by the flow and the order forms ---------- */

interface ParallelProof {
  /** Diagram and set-up, shown above the task. */
  prompt: Block[];
  origin: string;
  x: Pt;
  y: Pt;
  u: Pt;
  v: Pt;
}

function proofK(p: ParallelProof): Ratio {
  return factorOf(between(p.x, p.y), between(p.u, p.v)) as Ratio;
}

/** The proof as a flow: the two vectors, then what the multiple means. */
function parallelFlow(p: ParallelProof, key: string): Slide {
  const xy = between(p.x, p.y);
  const uv = between(p.u, p.v);
  const k = proofK(p);
  const XY = `${p.x.name}${p.y.name}`;
  const UV = `${p.u.name}${p.v.name}`;
  const claim = (m: Ratio) =>
    `$${arrow(p.x.name, p.y.name)} = ${kTex(m, arrow(p.u.name, p.v.name))}$: parallel, ${lengthWords(m)}`;
  const wrongK = [rDiv(R(1), k), rNeg(k)].filter((m) => !rEq(m, k));
  // Outcomes only restate the choice: saying whether it was right is the
  // grader's job, after Check.
  const finals = [
    { label: claim(k), outcome: `So $${XY}$ is parallel to $${UV}$ and ${lengthWords(k)}.` },
    ...wrongK.map((m) => ({ label: claim(m), outcome: `So $${XY}$ is parallel to $${UV}$ and ${lengthWords(m)}.` })),
    {
      label: `Not parallel: $${XY}$ and $${UV}$ share no point`,
      outcome: `So $${XY}$ is not parallel to $${UV}$.`,
    },
  ];
  const xyLabels = [vt(xy), ...vectorSlips(xy).map(vt)].map((t) => `$${t}$`);
  const uvLabels = [vt(uv), ...vectorSlips(uv).map(vt)].map((t) => `$${t}$`);
  return {
    kind: 'flow',
    prompt: [
      ...p.prompt,
      { kind: 'prose', text: `Show that $${XY}$ is parallel to $${UV}$. Each answer decides what is asked next.` },
    ],
    subject: `${arrow(p.x.name, p.y.name)} \\parallel ${arrow(p.u.name, p.v.name)}`,
    steps: [
      {
        id: 'xy',
        ask: `Which is $${arrow(p.x.name, p.y.name)}$?`,
        branches: turned(xyLabels, `${key}xy`).map((label) => ({ label, to: 'uv' })),
      },
      {
        id: 'uv',
        ask: `And $${arrow(p.u.name, p.v.name)}$?`,
        branches: turned(uvLabels, `${key}uv`).map((label) => ({ label, to: 'so' })),
      },
      {
        id: 'so',
        ask: 'So what does that show?',
        branches: turned(finals, `${key}so`),
      },
    ],
    answer: [xyLabels[0], uvLabels[0], finals[0].label],
  };
}

interface OrderStep {
  text: string;
  why: string;
}

/** The chain of a parallel proof, each step leaning on the one above. */
function parallelChain(p: ParallelProof): { steps: string[]; pool: OrderStep[] } {
  const xy = between(p.x, p.y);
  const uv = between(p.u, p.v);
  const k = proofK(p);
  const XY = arrow(p.x.name, p.y.name);
  const UV = arrow(p.u.name, p.v.name);
  const ends = [p.x, p.y].filter((q) => q.name !== p.origin).map((q) => `$${arrow(p.origin, q.name)} = ${vt(q.pos)}$`);
  const factor = `${k.n < 0 ? '-' : ''}${ratioTex(rAbs(k)) === '1' ? '' : ratioTex(rAbs(k))}\\left(${vt(uv)}\\right)`;
  const steps = [
    `${ends.join(' and ')}.`,
    `So $${XY} = ${vt(xy)}$.`,
    `Take out a factor: $${XY} = ${factor}$.`,
    `The bracket is $${UV}$, so $${XY} = ${kTex(k, UV)}$.`,
    `So $${p.x.name}${p.y.name}$ is parallel to $${p.u.name}${p.v.name}$ and ${lengthWords(k)}.`,
  ];
  const inverse = rDiv(R(1), k);
  const pool: OrderStep[] = [
    {
      text: `So $${XY} = ${arrow(p.origin, p.x.name)} - ${arrow(p.origin, p.y.name)}$.`,
      why: 'It is destination minus start, the other way round.',
    },
    {
      text: `So $${p.x.name}${p.y.name}$ and $${p.u.name}${p.v.name}$ lie on one straight line.`,
      why: 'Parallel is not the same line: that needs a shared point too.',
    },
    {
      text: `So $${p.x.name}${p.y.name}$ is parallel to $${p.u.name}${p.v.name}$ and ${lengthWords(inverse)}.`,
      why: `That reads the multiple the wrong way up: $${ratioTex(k)}$ times $${UV}$ is ${lengthWords(k)}.`,
    },
    {
      text: `So $${p.x.name}${p.y.name}$ is perpendicular to $${p.u.name}${p.v.name}$.`,
      why: 'A multiple says the directions match, not that they meet at a right angle.',
    },
  ];
  return { steps, pool };
}

function parallelOrder(p: ParallelProof, picks: number[]): Slide {
  const { steps: proof, pool } = parallelChain(p);
  const { steps, answer } = orderBank(
    proof,
    picks.map((i) => pool[i].text),
  );
  return {
    kind: 'order',
    prompt: [
      ...p.prompt,
      {
        kind: 'prose',
        text: `Prove that $${p.x.name}${p.y.name}$ is parallel to $${p.u.name}${p.v.name}$. Tap the steps in order. ${picks.length === 1 ? 'One step does not belong.' : 'Two steps do not belong.'}`,
      },
    ],
    steps,
    answer,
  };
}

function parallelOrderSolution(p: ParallelProof, picks: number[]): SolutionStep[] {
  const { steps, pool } = parallelChain(p);
  return [
    { text: 'Each step uses the one before it, so the proof runs:' },
    ...steps.map((text, idx) => ({ text: `${idx + 1}. ${text}` })),
    ...picks.map((i) => ({ text: `Not part of it: “${pool[i].text}” ${pool[i].why}` })),
  ];
}

function parallelSolution(p: ParallelProof): SolutionStep[] {
  const k = proofK(p);
  const UV = arrow(p.u.name, p.v.name);
  return [
    { text: 'Write both vectors in terms of $\\mathbf{a}$ and $\\mathbf{b}$, each as destination minus start.' },
    ...routeLines(p.origin, p.x, p.y),
    ...routeLines(p.origin, p.u, p.v),
    { text: 'Compare the two: the same multiple turns up on both coefficients.' },
    { tex: `${arrow(p.x.name, p.y.name)} = ${kTex(k, UV)}` },
    {
      text: `So $${p.x.name}${p.y.name}$ is parallel to $${p.u.name}${p.v.name}$ and ${lengthWords(k)}.`,
    },
  ];
}

/* ---------- lesson 1: midpoints in a triangle ---------- */

type MidRole = 'O' | 'A' | 'B' | 'M1' | 'M2' | 'M3';
const MID_ROLES: MidRole[] = ['O', 'A', 'B', 'M1', 'M2', 'M3'];
const MID_NAMES = [
  ['M', 'N', 'P'],
  ['X', 'Y', 'Z'],
  ['D', 'E', 'F'],
];
const isMid = (r: string) => r.startsWith('M');

interface MidScene {
  s: number;
  t: number;
  set: number;
}

function sampleMidScene(rng: Rng, difficulty: number): MidScene {
  if (difficulty > 1) return { s: rng.pick([1, 2, 3, 4]), t: rng.pick([1, 2, 3, 4]), set: rng.int(0, 2) };
  const s = rng.pick([2, 4, 6]);
  return { s, t: s, set: rng.int(0, 2) };
}

function midPoints({ s, t, set }: MidScene): Record<MidRole, Pt> {
  const [m1, m2, m3] = MID_NAMES[set];
  return {
    O: { name: 'O', pos: vec(0, 0) },
    A: { name: 'A', pos: vec(s, 0) },
    B: { name: 'B', pos: vec(0, t) },
    M1: { name: m1, pos: vec(R(s, 2), 0), derive: `\\frac{1}{2}${arrow('O', 'A')}` },
    M2: { name: m2, pos: vec(0, R(t, 2)), derive: `\\frac{1}{2}${arrow('O', 'B')}` },
    M3: {
      name: m3,
      pos: vec(R(s, 2), R(t, 2)),
      derive: `\\frac{1}{2}\\left(${arrow('O', 'A')} + ${arrow('O', 'B')}\\right)`,
    },
  };
}

const MID_SIDE: Record<string, string> = { M1: 'OA', M2: 'OB', M3: 'AB' };

function midPrompt(scene: MidScene, used: MidRole[], dashed: [MidRole, MidRole][]): Block[] {
  const pts = midPoints(scene);
  const mids = (['M1', 'M2', 'M3'] as MidRole[]).filter((r) => used.includes(r));
  const toScreen = (p: V): P2 => [(rVal(p.a) / scene.s) * 200 + (rVal(p.b) / scene.t) * 70, (rVal(p.b) / scene.t) * 130];
  const at = (r: MidRole) => toScreen(pts[r].pos);
  const tickEnds: Record<string, [MidRole, MidRole]> = { M1: ['O', 'A'], M2: ['O', 'B'], M3: ['A', 'B'] };
  const svg = figureSvg({
    dots: (['O', 'A', 'B', ...mids] as MidRole[]).map((r) => ({ name: pts[r].name, at: at(r) })),
    lines: [{ from: at('A'), to: at('B') }, ...dashed.map(([p, q]) => ({ from: at(p), to: at(q), dashed: true }))],
    arrows: [
      { from: at('O'), to: at('A'), label: vecLabel(scene.s, 'a') },
      { from: at('O'), to: at('B'), label: vecLabel(scene.t, 'b') },
    ],
    ticks: mids.flatMap((r, idx) => {
      const [p, q] = tickEnds[r];
      return [
        { from: at(p), to: at(r), count: idx + 1 },
        { from: at(r), to: at(q), count: idx + 1 },
      ];
    }),
    aria: 'Triangle OAB with the midpoints the question names',
  });
  const sentences = mids.map((r) => `$${pts[r].name}$ is the midpoint of $${MID_SIDE[r]}$.`);
  return [
    { kind: 'diagram', svg },
    {
      kind: 'prose',
      text: `$${arrow('O', 'A')} = ${vt(pts.A.pos)}$ and $${arrow('O', 'B')} = ${vt(pts.B.pos)}$. ${sentences.join(' ')}`,
    },
  ];
}

interface MidRouteParams extends MidScene {
  from: MidRole;
  to: MidRole;
}

const MID_ROUTE_PAIRS = pairsOf(MID_ROLES, ['OA', 'OB'], (x, y) => isMid(x) || isMid(y));

/** A vector in a triangle with midpoints, written in terms of a and b. */
const midRoute: Generator<MidRouteParams> = {
  id: 'vproof-mid-route',
  sample: (rng, difficulty) => {
    const [from, to] = rng.pick(MID_ROUTE_PAIRS);
    return { ...sampleMidScene(rng, difficulty), from, to };
  },
  render: (params) => {
    const pts = midPoints(params);
    return routeSlide(
      midPrompt(params, [params.from, params.to], [[params.from, params.to]]),
      pts[params.from],
      pts[params.to],
    );
  },
  choices: (params) => {
    const pts = midPoints(params);
    return steer(vectorChoices(between(pts[params.from], pts[params.to])), JSON.stringify(params));
  },
  solution: (params) => {
    const pts = midPoints(params);
    return routeSolution('O', pts[params.from], pts[params.to]);
  },
};

/** The three midpoint segments and the side each runs parallel to. */
const MID_PARALLELS: [MidRole, MidRole, MidRole, MidRole][] = [
  ['M1', 'M2', 'A', 'B'],
  ['M1', 'M3', 'O', 'B'],
  ['M2', 'M3', 'O', 'A'],
];

interface MidPairParams extends MidScene {
  pair: number;
  flipXY: boolean;
  flipUV: boolean;
}

function sampleMidPair(rng: Rng, difficulty: number): MidPairParams {
  return {
    ...sampleMidScene(rng, difficulty),
    pair: rng.int(0, 2),
    flipXY: rng.chance(0.5),
    flipUV: rng.chance(0.5),
  };
}

function midProof(params: MidPairParams): ParallelProof {
  const pts = midPoints(params);
  const [m, n, u, v] = MID_PARALLELS[params.pair];
  const [x, y] = params.flipXY ? [n, m] : [m, n];
  const [p, q] = params.flipUV ? [v, u] : [u, v];
  return {
    prompt: midPrompt(params, [m, n], [[m, n]]),
    origin: 'O',
    x: pts[x],
    y: pts[y],
    u: pts[p],
    v: pts[q],
  };
}

interface MidMultipleParams extends MidPairParams {
  sideFirst: boolean;
}

/** The scalar that turns the midpoint segment into the side, as a tile. */
const midMultiple: Generator<MidMultipleParams> = {
  id: 'vproof-mid-multiple',
  sample: (rng, difficulty) => ({ ...sampleMidPair(rng, difficulty), sideFirst: rng.chance(0.5) }),
  render: (params) => {
    const proof = midProof(params);
    const [first, second] = params.sideFirst ? [[proof.u, proof.v], [proof.x, proof.y]] : [[proof.x, proof.y], [proof.u, proof.v]];
    const k = factorOf(between(first[0], first[1]), between(second[0], second[1])) as Ratio;
    return {
      kind: 'tiles',
      prompt: [
        ...proof.prompt,
        {
          kind: 'prose',
          text: `Find the number $k$ with $${arrow(first[0].name, first[1].name)} = k${arrow(second[0].name, second[1].name)}$.`,
        },
      ],
      template: 'k = {0}',
      bank: ratioBank([k], [rNeg(k), rDiv(R(1), k), rNeg(rDiv(R(1), k))]),
      answer: [ratioTex(k)],
    };
  },
  solution: (params) => {
    const proof = midProof(params);
    const [first, second] = params.sideFirst ? [[proof.u, proof.v], [proof.x, proof.y]] : [[proof.x, proof.y], [proof.u, proof.v]];
    const k = factorOf(between(first[0], first[1]), between(second[0], second[1])) as Ratio;
    return [
      { text: 'Write both vectors in terms of $\\mathbf{a}$ and $\\mathbf{b}$, each as destination minus start.' },
      ...routeLines('O', first[0], first[1]),
      ...routeLines('O', second[0], second[1]),
      { text: 'The same multiple takes one to the other on both coefficients.' },
      { tex: `${arrow(first[0].name, first[1].name)} = ${kTex(k, arrow(second[0].name, second[1].name))}` },
    ];
  },
};

/** The midpoint theorem as a walk: the two vectors, then what they show. */
const midFlow: Generator<MidPairParams> = {
  id: 'vproof-mid-flow',
  sample: sampleMidPair,
  render: (params) => parallelFlow(midProof(params), JSON.stringify(params)),
  solution: (params) => parallelSolution(midProof(params)),
};

interface MidOrderParams extends MidPairParams {
  picks: number[];
}

/** The midpoint proof, put in order. */
const midOrder: Generator<MidOrderParams> = {
  id: 'vproof-mid-order',
  sample: (rng, difficulty) => ({
    ...sampleMidPair(rng, difficulty),
    picks: rng.sample([0, 1, 2, 3], difficulty > 1 ? 2 : 1),
  }),
  render: (params) => parallelOrder(midProof(params), params.picks),
  solution: (params) => parallelOrderSolution(midProof(params), params.picks),
};

/* ---------- lesson 2: showing lines are parallel ---------- */

const PAIR_NAMES: [string, string][] = [
  ['PQ', 'RS'],
  ['AB', 'CD'],
  ['XY', 'UV'],
  ['EF', 'GH'],
];

interface MultipleParams {
  p: number;
  q: number;
  kn: number;
  kd: number;
  set: number;
}

function coprimePair(rng: Rng): [number, number] {
  for (;;) {
    const p = rng.int(1, 4) * rng.sign();
    const q = rng.int(1, 5) * rng.sign();
    if (gcd(p, q) === 1 && !(Math.abs(p) === 1 && Math.abs(q) === 1)) return [p, q];
  }
}

const MULTIPLES: Record<1 | 2, [number, number][]> = {
  1: [[2, 1], [3, 1], [4, 1], [-2, 1], [-3, 1], [1, 2], [1, 3], [-1, 2]],
  2: [[3, 2], [2, 3], [-3, 2], [-1, 2], [4, 3], [3, 4], [-2, 3], [5, 2], [-2, 1], [1, 3]],
};

function sampleMultiple(rng: Rng, difficulty: number): MultipleParams {
  const [p, q] = coprimePair(rng);
  const [kn, kd] = rng.pick(MULTIPLES[difficulty > 1 ? 2 : 1]);
  return { p, q, kn, kd, set: rng.int(0, 3) };
}

/** u = k v with both written in whole numbers. */
function multipleVectors({ p, q, kn, kd }: MultipleParams): { u: V; v: V; k: Ratio } {
  return { u: vec(kn * p, kn * q), v: vec(kd * p, kd * q), k: R(kn, kd) };
}

/** `name = u = m(base)`, or just `name = base` when the multiple is one. */
function factorLine(name: string, u: V, m: number, base: V): string {
  if (m === 1) return `${name} = ${vt(base)}`;
  return `${name} = ${vt(u)} = ${m === -1 ? '-' : m}\\left(${vt(base)}\\right)`;
}

function multipleSolution(params: MultipleParams): SolutionStep[] {
  const { u, v, k } = multipleVectors(params);
  const [PQ, RS] = PAIR_NAMES[params.set];
  const base = vec(params.p, params.q);
  return [
    { text: 'Take out the largest common factor of each vector, so both are written as a multiple of the same bracket.' },
    { tex: factorLine(arrow(PQ[0], PQ[1]), u, params.kn, base) },
    { tex: factorLine(arrow(RS[0], RS[1]), v, params.kd, base) },
    { text: `So $${arrow(PQ[0], PQ[1])}$ is $${ratioTex(k)}$ times $${arrow(RS[0], RS[1])}$: divide the two multiples.` },
    { tex: `${arrow(PQ[0], PQ[1])} = ${kTex(k, arrow(RS[0], RS[1]))}` },
  ];
}

/** The multiple between two vectors written in a and b, placed as a tile. */
const multiple: Generator<MultipleParams> = {
  id: 'vproof-multiple',
  sample: sampleMultiple,
  render: (params) => {
    const { u, v, k } = multipleVectors(params);
    const [PQ, RS] = PAIR_NAMES[params.set];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `$${arrow(PQ[0], PQ[1])} = ${vt(u)}$ and $${arrow(RS[0], RS[1])} = ${vt(v)}$. Find the number $k$ with $${arrow(PQ[0], PQ[1])} = k${arrow(RS[0], RS[1])}$.`,
        },
      ],
      template: 'k = {0}',
      bank: ratioBank([k], [rNeg(k), rDiv(R(1), k), rNeg(rDiv(R(1), k))]),
      answer: [ratioTex(k)],
    };
  },
  choices: (params) => {
    const { k } = multipleVectors(params);
    const wrong = [rNeg(k), rDiv(R(1), k), rNeg(rDiv(R(1), k))];
    return steer(
      options(
        { tex: ratioTex(k), answer: `${k.n}/${k.d}` },
        ...wrong.map((w) => ({ tex: ratioTex(w), answer: `${w.n}/${w.d}` })),
      ),
      JSON.stringify(params),
    );
  },
  solution: multipleSolution,
};

interface CheckParams extends MultipleParams {
  broken: boolean;
  bump: number;
}

/** Parallel or not: the multiple has to be the same on both coefficients. */
const parallelCheck: Generator<CheckParams> = {
  id: 'vproof-parallel-check',
  sample: (rng, difficulty) => {
    const base = sampleMultiple(rng, difficulty);
    return { ...base, broken: rng.chance(0.45), bump: rng.pick([-1, 1]) };
  },
  render: (params) => {
    const { u: whole, v, k } = multipleVectors(params);
    const u = params.broken ? vAdd(whole, vec(0, params.bump)) : whole;
    const [PQ, RS] = PAIR_NAMES[params.set];
    const rel = (m: Ratio) => `${arrow(PQ[0], PQ[1])} = ${kTex(m, arrow(RS[0], RS[1]))}`;
    const no = '\\text{Not parallel}';
    const rows = [rel(k), rel(rDiv(R(1), k)), rel(rNeg(k)), no];
    const correct = params.broken ? no : rows[0];
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `$${arrow(PQ[0], PQ[1])} = ${vt(u)}$ and $${arrow(RS[0], RS[1])} = ${vt(v)}$. Which is true?`,
        },
      ],
      ...placed(
        correct,
        rows.filter((r) => r !== correct),
        JSON.stringify(params),
      ),
    };
  },
  solution: (params) => {
    const { u: whole, v } = multipleVectors(params);
    const u = params.broken ? vAdd(whole, vec(0, params.bump)) : whole;
    const [PQ, RS] = PAIR_NAMES[params.set];
    const ka = rDiv(u.a, v.a);
    const kb = rDiv(u.b, v.b);
    return [
      { text: 'Parallel means one vector is a multiple of the other, with the same multiple on both coefficients. Divide coefficient by coefficient.' },
      { tex: `\\mathbf{a}: \\; ${ratioTex(u.a)} \\div ${ratioTex(v.a).startsWith('-') ? `\\left(${ratioTex(v.a)}\\right)` : ratioTex(v.a)} = ${ratioTex(ka)}` },
      { tex: `\\mathbf{b}: \\; ${ratioTex(u.b)} \\div ${ratioTex(v.b).startsWith('-') ? `\\left(${ratioTex(v.b)}\\right)` : ratioTex(v.b)} = ${ratioTex(kb)}` },
      params.broken
        ? { text: `The two multiples differ, so no single number works: $${PQ}$ is not parallel to $${RS}$.` }
        : { text: `The same multiple both times, so $${arrow(PQ[0], PQ[1])} = ${kTex(ka, arrow(RS[0], RS[1]))}$ and the two are parallel.` },
    ];
  },
};

/* The triangle with a point on each of two sides, cut in the same ratio. */

type ParRole = 'O' | 'A' | 'B' | 'X' | 'Y';
const PAR_ROLES: ParRole[] = ['O', 'A', 'B', 'X', 'Y'];
const PAR_NAMES: [string, string][] = [
  ['X', 'Y'],
  ['P', 'Q'],
  ['C', 'D'],
];

interface ParScene {
  s: number;
  t: number;
  p: number;
  q: number;
  beyond: boolean;
  set: number;
}

function sampleParScene(rng: Rng, difficulty: number): ParScene {
  if (difficulty > 1) {
    const beyond = rng.chance(0.4);
    const [p, q] = rng.pick(
      beyond
        ? [[1, 1], [1, 2], [2, 1]]
        : [[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [1, 1]],
    );
    return { s: rng.pick([1, 2, 3, 4]), t: rng.pick([1, 2, 3, 4]), p, q, beyond, set: rng.int(0, 2) };
  }
  const [p, q] = rng.pick([[1, 2], [2, 1], [1, 3], [3, 1]]);
  return { s: rng.pick([1, 2]) * (p + q), t: rng.pick([1, 2]) * (p + q), p, q, beyond: false, set: rng.int(0, 2) };
}

/** How far along OA the point is, as a multiple of OA. */
const parX = ({ p, q, beyond }: ParScene): Ratio => (beyond ? R(p + q, p) : R(p, p + q));

function parPoints(scene: ParScene): Record<ParRole, Pt> {
  const [xn, yn] = PAR_NAMES[scene.set];
  const x = parX(scene);
  return {
    O: { name: 'O', pos: vec(0, 0) },
    A: { name: 'A', pos: vec(scene.s, 0) },
    B: { name: 'B', pos: vec(0, scene.t) },
    X: { name: xn, pos: vec(rMul(x, R(scene.s)), 0), derive: kTex(x, arrow('O', 'A')) },
    Y: { name: yn, pos: vec(0, rMul(x, R(scene.t))), derive: kTex(x, arrow('O', 'B')) },
  };
}

function parPrompt(scene: ParScene, dashed: [ParRole, ParRole][]): Block[] {
  const pts = parPoints(scene);
  const [xn, yn] = PAR_NAMES[scene.set];
  const toScreen = (p: V): P2 => [(rVal(p.a) / scene.s) * 200 + (rVal(p.b) / scene.t) * 70, (rVal(p.b) / scene.t) * 130];
  const at = (r: ParRole) => toScreen(pts[r].pos);
  const { p, q } = scene;
  const caption = scene.beyond
    ? [`OA : A${xn} = ${p} : ${q}`, `OB : B${yn} = ${p} : ${q}`]
    : [`O${xn} : ${xn}A = ${p} : ${q}`, `O${yn} : ${yn}B = ${p} : ${q}`];
  const svg = figureSvg({
    dots: PAR_ROLES.map((r) => ({ name: pts[r].name, at: at(r) })),
    lines: [
      { from: at('A'), to: at('B') },
      ...(scene.beyond ? [{ from: at('A'), to: at('X') }, { from: at('B'), to: at('Y') }] : []),
      ...dashed.map(([m, n]) => ({ from: at(m), to: at(n), dashed: true })),
    ],
    arrows: [
      { from: at('O'), to: at('A'), label: vecLabel(scene.s, 'a') },
      { from: at('O'), to: at('B'), label: vecLabel(scene.t, 'b') },
    ],
    caption,
    aria: 'Triangle OAB with a point on each of the lines OA and OB',
  });
  const where = scene.beyond
    ? `$O${'A'}$ is extended to $${xn}$ with $OA : A${xn} = ${p} : ${q}$, and $OB$ is extended to $${yn}$ with $OB : B${yn} = ${p} : ${q}$.`
    : `$${xn}$ lies on $OA$ with $O${xn} : ${xn}A = ${p} : ${q}$, and $${yn}$ lies on $OB$ with $O${yn} : ${yn}B = ${p} : ${q}$.`;
  return [
    { kind: 'diagram', svg },
    {
      kind: 'prose',
      text: `$${arrow('O', 'A')} = ${vt(pts.A.pos)}$ and $${arrow('O', 'B')} = ${vt(pts.B.pos)}$. ${where}`,
    },
  ];
}

interface ParRouteParams extends ParScene {
  from: ParRole;
  to: ParRole;
}

const PAR_ROUTE_PAIRS = pairsOf(PAR_ROLES, ['OA', 'OB'], (x, y) => ['X', 'Y'].includes(x) || ['X', 'Y'].includes(y));

/** A vector in the triangle with two ratio points, in terms of a and b. */
const parallelRoute: Generator<ParRouteParams> = {
  id: 'vproof-parallel-route',
  sample: (rng, difficulty) => {
    const [from, to] = rng.pick(PAR_ROUTE_PAIRS);
    return { ...sampleParScene(rng, difficulty), from, to };
  },
  render: (params) => {
    const pts = parPoints(params);
    return routeSlide(parPrompt(params, [[params.from, params.to]]), pts[params.from], pts[params.to]);
  },
  choices: (params) => {
    const pts = parPoints(params);
    return steer(vectorChoices(between(pts[params.from], pts[params.to])), JSON.stringify(params));
  },
  solution: (params) => {
    const pts = parPoints(params);
    return routeSolution('O', pts[params.from], pts[params.to]);
  },
};

interface ParPairParams extends ParScene {
  flipXY: boolean;
  flipUV: boolean;
}

function sampleParPair(rng: Rng, difficulty: number): ParPairParams {
  return { ...sampleParScene(rng, difficulty), flipXY: rng.chance(0.5), flipUV: rng.chance(0.5) };
}

function parProof(params: ParPairParams): ParallelProof {
  const pts = parPoints(params);
  const [x, y] = params.flipXY ? [pts.Y, pts.X] : [pts.X, pts.Y];
  const [u, v] = params.flipUV ? [pts.B, pts.A] : [pts.A, pts.B];
  return { prompt: parPrompt(params, [['X', 'Y']]), origin: 'O', x, y, u, v };
}

/** Two ratio points make a line parallel to the third side: the flow. */
const parallelFlowGen: Generator<ParPairParams> = {
  id: 'vproof-parallel-flow',
  sample: sampleParPair,
  render: (params) => parallelFlow(parProof(params), JSON.stringify(params)),
  solution: (params) => parallelSolution(parProof(params)),
};

interface ParOrderParams extends ParPairParams {
  picks: number[];
}

/** The same proof, put in order. */
const parallelOrderGen: Generator<ParOrderParams> = {
  id: 'vproof-parallel-order',
  sample: (rng, difficulty) => ({
    ...sampleParPair(rng, difficulty),
    picks: rng.sample([0, 1, 2, 3], difficulty > 1 ? 2 : 1),
  }),
  render: (params) => parallelOrder(parProof(params), params.picks),
  solution: (params) => parallelOrderSolution(parProof(params), params.picks),
};

/* ---------- lesson 3: showing points are collinear ---------- */

const TRIPLES: [string, string, string][] = [
  ['A', 'B', 'C'],
  ['P', 'Q', 'R'],
  ['L', 'M', 'N'],
];

interface CollinearScene {
  oa: V;
  ab: V;
  k: number;
  set: number;
}

function sampleCollinearScene(rng: Rng, difficulty: number, ks: number[]): CollinearScene {
  const set = rng.int(0, 2);
  const k = rng.pick(ks);
  if (difficulty > 1) {
    for (;;) {
      const oa = vec(rng.int(-2, 3), rng.int(-2, 3));
      const [p, q] = coprimePair(rng);
      if (vZero(oa) || factorOf(oa, vec(p, q))) continue;
      return { oa, ab: vec(p, q), k, set };
    }
  }
  const m = rng.pick([1, 2, 3]);
  const n = rng.pick([1, 2, 3]);
  return { oa: vec(m, 0), ab: vec(-m, n), k, set };
}

interface CollinearFlowParams extends CollinearScene {
  broken: boolean;
  bumpA: boolean;
  bump: number;
}

/** Three positions; are the points on one line? Worked as a flow. */
const collinearFlow: Generator<CollinearFlowParams> = {
  id: 'vproof-collinear-flow',
  sample: (rng, difficulty) => ({
    ...sampleCollinearScene(rng, difficulty, difficulty > 1 ? [2, 3, 4, -2, -1] : [2, 3, 4, -1]),
    broken: rng.chance(0.4),
    bumpA: rng.chance(0.5),
    bump: rng.pick([-1, 1]),
  }),
  render: (params) => {
    const [A, B, C] = TRIPLES[params.set];
    const { oa, ab, k } = params;
    const ob = vAdd(oa, ab);
    const straight = vAdd(oa, vScale(ab, R(k)));
    const oc = params.broken ? vAdd(straight, params.bumpA ? vec(params.bump, 0) : vec(0, params.bump)) : straight;
    const ac = vSub(oc, oa);
    const shown = factorOf(ac, ab) ?? (ab.a.n !== 0 ? rDiv(ac.a, ab.a) : rDiv(ac.b, ab.b));
    const key = JSON.stringify(params);
    const abLabels = [vt(ab), ...vectorSlips(ab, [vAdd(oa, ob)]).map(vt)].map((t) => `$${t}$`);
    const acLabels = [vt(ac), ...vectorSlips(ac, [vAdd(oa, oc)]).map(vt)].map((t) => `$${t}$`);
    const claim = (m: Ratio) => `$${arrow(A, C)} = ${kTex(m, arrow(A, B))}$, so collinear`;
    // Outcomes restate the choice and never say whether it was right.
    const collinear = `So $${A}$, $${B}$ and $${C}$ are collinear.`;
    const yes = { label: claim(shown), outcome: collinear };
    const no = { label: 'No multiple works, so not collinear', outcome: `So $${A}$, $${B}$ and $${C}$ are not collinear.` };
    const wrong = [rNeg(shown), rDiv(R(1), shown)]
      .filter((m) => !rEq(m, shown) && m.n !== 0)
      .map((m) => ({ label: claim(m), outcome: collinear }));
    const finals = [params.broken ? no : yes, params.broken ? yes : no, ...wrong];
    return {
      kind: 'flow',
      prompt: [
        { kind: 'prose', text: `Are $${A}$, $${B}$ and $${C}$ collinear? Each answer decides what is asked next.` },
      ],
      subject: `\\begin{aligned} ${arrow('O', A)} &= ${vt(oa)} \\\\ ${arrow('O', B)} &= ${vt(ob)} \\\\ ${arrow('O', C)} &= ${vt(oc)} \\end{aligned}`,
      steps: [
        {
          id: 'ab',
          ask: `Which is $${arrow(A, B)}$?`,
          branches: turned(abLabels, `${key}ab`).map((label) => ({ label, to: 'ac' })),
        },
        {
          id: 'ac',
          ask: `And $${arrow(A, C)}$?`,
          branches: turned(acLabels, `${key}ac`).map((label) => ({ label, to: 'so' })),
        },
        { id: 'so', ask: 'So what does that show?', branches: turned(finals, `${key}so`) },
      ],
      answer: [abLabels[0], acLabels[0], finals[0].label],
    };
  },
  solution: (params) => {
    const [A, B, C] = TRIPLES[params.set];
    const { oa, ab, k } = params;
    const ob = vAdd(oa, ab);
    const straight = vAdd(oa, vScale(ab, R(k)));
    const oc = params.broken ? vAdd(straight, params.bumpA ? vec(params.bump, 0) : vec(0, params.bump)) : straight;
    const ac = vSub(oc, oa);
    const m = factorOf(ac, ab);
    return [
      { text: 'Find two vectors that share a point, each as destination minus start.' },
      { tex: `${arrow(A, B)} = ${bk(ob, false)} - ${bk(oa, true)}` },
      { tex: `${arrow(A, B)} = ${vt(ab)}` },
      { tex: `${arrow(A, C)} = ${bk(oc, false)} - ${bk(oa, true)}` },
      { tex: `${arrow(A, C)} = ${vt(ac)}` },
      m
        ? { text: `$${arrow(A, C)} = ${kTex(m, arrow(A, B))}$, so $${A}${B}$ and $${A}${C}$ are parallel. They share the point $${A}$, so $${A}$, $${B}$ and $${C}$ are collinear.` }
        : { text: `The two coefficients need different multiples, so $${A}${C}$ is not parallel to $${A}${B}$ and the three points are not collinear.` },
    ];
  },
};

interface CollinearOrderParams extends CollinearScene {
  shareB: boolean;
  picks: number[];
}

function collinearChain(params: CollinearOrderParams): { steps: string[]; pool: OrderStep[] } {
  const [A, B, C] = TRIPLES[params.set];
  const { oa, ab, k } = params;
  const ob = vAdd(oa, ab);
  const oc = vAdd(oa, vScale(ab, R(k)));
  const [start, startPos] = params.shareB ? [B, ob] : [A, oa];
  const second = vSub(oc, startPos);
  const m = params.shareB ? R(k - 1) : R(k);
  const steps = [
    `$${arrow(A, B)} = ${arrow('O', B)} - ${arrow('O', A)} = ${vt(ab)}$.`,
    `Then $${arrow(start, C)} = ${vt(second)} = ${kTex(m, arrow(A, B))}$.`,
    `So $${A}${B}$ is parallel to $${start}${C}$, and both pass through $${start}$.`,
    `So $${A}$, $${B}$ and $${C}$ are collinear.`,
  ];
  const pool: OrderStep[] = [
    { text: `So $${arrow(A, B)} = ${arrow(start, C)}$.`, why: 'They are parallel, not equal: one is a multiple of the other.' },
    {
      text: `$${arrow(A, B)} = ${arrow('O', A)} - ${arrow('O', B)} = ${vt(vNeg(ab))}$.`,
      why: 'It is destination minus start, the other way round.',
    },
    {
      text: `So $${A}${B}$ and $${start}${C}$ are parallel, so they never meet.`,
      why: `They meet at $${start}$, which is the whole point.`,
    },
    {
      text: `So $${A}${B}$ is perpendicular to $${start}${C}$.`,
      why: 'A multiple says the directions match, not that they meet at a right angle.',
    },
  ];
  return { steps, pool };
}

/** The collinear proof, put in order. */
const collinearOrder: Generator<CollinearOrderParams> = {
  id: 'vproof-collinear-order',
  sample: (rng, difficulty) => {
    const shareB = rng.chance(0.5);
    const scene = sampleCollinearScene(rng, difficulty, shareB ? [3, 4, -1, -2] : [2, 3, 4, -1, -2]);
    return { ...scene, shareB, picks: rng.sample([0, 1, 2, 3], difficulty > 1 ? 2 : 1) };
  },
  render: (params) => {
    const [A, B, C] = TRIPLES[params.set];
    const { oa, ab, k } = params;
    const { steps: proof, pool } = collinearChain(params);
    const { steps, answer } = orderBank(
      proof,
      params.picks.map((i) => pool[i].text),
    );
    const oc = vAdd(oa, vScale(ab, R(k)));
    return {
      kind: 'order',
      prompt: [
        {
          kind: 'prose',
          text: `$${arrow('O', A)} = ${vt(oa)}$, $${arrow('O', B)} = ${vt(vAdd(oa, ab))}$ and $${arrow('O', C)} = ${vt(oc)}$.`,
        },
        {
          kind: 'prose',
          text: `Prove that $${A}$, $${B}$ and $${C}$ are collinear. Tap the steps in order. ${params.picks.length === 1 ? 'One step does not belong.' : 'Two steps do not belong.'}`,
        },
      ],
      steps,
      answer,
    };
  },
  solution: (params) => {
    const { steps, pool } = collinearChain(params);
    return [
      { text: 'Each step uses the one before it, so the proof runs:' },
      ...steps.map((text, idx) => ({ text: `${idx + 1}. ${text}` })),
      ...params.picks.map((i) => ({ text: `Not part of it: “${pool[i].text}” ${pool[i].why}` })),
    ];
  },
};

type SplitForm = 'part' | 'beyond' | 'op';

interface SplitParams {
  form: SplitForm;
  m: number;
  n: number;
  set: number;
}

const SPLIT_PAIRS: Record<1 | 2, [number, number][]> = {
  1: [[1, 2], [2, 1], [1, 3], [3, 1]],
  2: [[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [1, 4], [3, 4], [4, 3]],
};

function splitNames({ form, set }: SplitParams): { first: string; mid: string; last: string } {
  const [A, B, C] = TRIPLES[set];
  // A point between the ends is P for the fraction forms; the beyond form
  // has the middle letter between the first and the last.
  if (form === 'beyond') return { first: A, mid: B, last: C };
  return { first: A, mid: ['P', 'X', 'D'][set], last: B };
}

/** A ratio along a line, read off a multiple. */
const splitRatio: Generator<SplitParams> = {
  id: 'vproof-split-ratio',
  sample: (rng, difficulty) => {
    const [m, n] = rng.pick(SPLIT_PAIRS[difficulty > 1 ? 2 : 1]);
    return { form: rng.pick(['part', 'beyond', 'op'] as SplitForm[]), m, n, set: rng.int(0, 2) };
  },
  render: (params) => {
    const { form, m, n } = params;
    const { first, mid, last } = splitNames(params);
    let text: string;
    if (form === 'part') {
      text = `$${mid}$ lies on $${first}${last}$ and $${arrow(first, mid)} = ${ratioTex(R(m, m + n))}${arrow(first, last)}$.`;
    } else if (form === 'beyond') {
      text = `$${first}$, $${mid}$ and $${last}$ lie on a straight line, in that order, and $${arrow(first, last)} = ${ratioTex(R(m + n, m))}${arrow(first, mid)}$.`;
    } else {
      text = `$${arrow('O', first)} = \\mathbf{a}$ and $${arrow('O', last)} = \\mathbf{b}$. $${mid}$ lies on $${first}${last}$ and $${arrow('O', mid)} = ${vt(vec(R(n, m + n), R(m, m + n)))}$.`;
    }
    return {
      kind: 'tiles',
      prompt: [{ kind: 'prose', text: `${text} Find the ratio $${first}${mid} : ${mid}${last}$.` }],
      template: `${first}${mid} : ${mid}${last} = {0} : {1}`,
      bank: wholeBank([m, n], [m + n, Math.abs(m - n) || m + n + 1]),
      answer: [`${m}`, `${n}`],
    };
  },
  choices: (params) => {
    const { m, n } = params;
    return steer(
      options({ tex: `${m} : ${n}` }, { tex: `${n} : ${m}` }, { tex: `${m} : ${m + n}` }, { tex: `${m + n} : ${n}` }),
      JSON.stringify(params),
    );
  },
  solution: (params) => {
    const { form, m, n } = params;
    const { first, mid, last } = splitNames(params);
    const whole = m + n;
    const lines: SolutionStep[] = [];
    if (form === 'part') {
      lines.push({ text: `$${first}${mid}$ is $${ratioTex(R(m, whole))}$ of the whole line, so $${mid}${last}$ is the rest.` });
      lines.push({ tex: `1 - ${ratioTex(R(m, whole))} = ${ratioTex(R(n, whole))}` });
    } else if (form === 'beyond') {
      lines.push({ text: `$${first}${last}$ is $${ratioTex(R(whole, m))}$ times $${first}${mid}$, so the extra piece $${mid}${last}$ is the difference.` });
      lines.push({ tex: `${ratioTex(R(whole, m))} - 1 = ${ratioTex(R(n, m))}` });
    } else {
      lines.push({ text: `Rewrite $${arrow('O', mid)}$ as $\\mathbf{a}$ plus a fraction of $${arrow(first, last)} = \\mathbf{b} - \\mathbf{a}$: the coefficient of $\\mathbf{b}$ is that fraction.` });
      lines.push({ tex: `${arrow('O', mid)} = \\mathbf{a} + ${ratioTex(R(m, whole))}\\left(\\mathbf{b} - \\mathbf{a}\\right)` });
      lines.push({ text: `So $${first}${mid}$ is $${ratioTex(R(m, whole))}$ of the line and $${mid}${last}$ is the other $${ratioTex(R(n, whole))}$.` });
    }
    lines.push({ text: 'Compare the two pieces and clear the fractions.' });
    lines.push({ tex: `${first}${mid} : ${mid}${last} = ${m} : ${n}` });
    return lines;
  },
};

interface UnknownParams extends MultipleParams {
  inA: boolean;
  shareB: boolean;
}

function unknownParts(params: UnknownParams) {
  const { u: second, v: ab, k } = multipleVectors(params);
  const x = params.inA ? second.a : second.b;
  const [A, B, C] = TRIPLES[params.set % 3];
  return { second, ab, k, x, A, B, C, start: params.shareB ? B : A };
}

/** The second vector with its unknown coefficient written as c. */
function unknownTex(second: V, inA: boolean): string {
  if (inA) {
    const b = second.b;
    return `c\\mathbf{a} ${b.n < 0 ? '-' : '+'} ${termTex(rAbs(b), '\\mathbf{b}')}`;
  }
  return `${vt(vec(second.a, 0))} + c\\mathbf{b}`;
}

/** A missing coefficient, fixed by the known one's multiple. */
const collinearUnknown: Generator<UnknownParams> = {
  id: 'vproof-collinear-unknown',
  sample: (rng, difficulty) => ({
    ...sampleMultiple(rng, difficulty),
    inA: rng.chance(0.5),
    shareB: rng.chance(0.5),
  }),
  render: (params) => {
    const { second, ab, A, B, C, start } = unknownParts(params);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `$${A}$, $${B}$ and $${C}$ are collinear. $${arrow(A, B)} = ${vt(ab)}$ and $${arrow(start, C)} = ${unknownTex(second, params.inA)}$. Find $c$.`,
        },
      ],
      lead: 'c =',
      keypad: FRACTION_KEYS,
      answer: ratioAnswer(unknownParts(params).x),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (params) => {
    const { x, ab, k } = unknownParts(params);
    const other = params.inA ? ab.a : ab.b;
    const wrong = [rNeg(x), rDiv(other, k), rAdd(x, R(1))];
    return steer(
      options(
        { tex: ratioTex(x), answer: `${x.n}/${x.d}` },
        ...wrong.map((w) => ({ tex: ratioTex(w), answer: `${w.n}/${w.d}` })),
      ),
      JSON.stringify(params),
    );
  },
  solution: (params) => {
    const { second, ab, k, x, A, B, C, start } = unknownParts(params);
    const known = params.inA ? 'b' : 'a';
    const knownOf = (v: V) => (params.inA ? v.b : v.a);
    return [
      {
        text: `Collinear means $${arrow(start, C)} = k${arrow(A, B)}$ for one number $k$. The coefficient of $\\mathbf{${known}}$ is known in both, so it fixes $k$.`,
      },
      { tex: `k = ${ratioTex(knownOf(second))} \\div ${ratioTex(knownOf(ab)).startsWith('-') ? `\\left(${ratioTex(knownOf(ab))}\\right)` : ratioTex(knownOf(ab))} = ${ratioTex(k)}` },
      { text: `The same multiple has to hold for the coefficient of $\\mathbf{${params.inA ? 'a' : 'b'}}$.` },
      {
        tex: `c = ${ratioTex(k)} \\times ${(() => {
          const t = ratioTex(params.inA ? ab.a : ab.b);
          return t.startsWith('-') ? `\\left(${t}\\right)` : t;
        })()} = ${ratioTex(x)}`,
      },
    ];
  },
};

/* ---------- lesson 4: ratios in shapes ---------- */

type ShapeRole = 'O' | 'A' | 'B' | 'C' | 'P' | 'Q';
const SHAPE_ROLES: ShapeRole[] = ['O', 'A', 'B', 'C', 'P', 'Q'];

interface ShapeScene {
  /** CB as a multiple of OA: 1 is a parallelogram. */
  k: Ratio;
  s: number;
  t: number;
  m: number;
  n: number;
  /** Q on CB with CQ : QB = r : w. */
  r: number;
  w: number;
}

function sampleShapeScene(rng: Rng, difficulty: number): ShapeScene {
  const [m, n] = rng.pick(difficulty > 1 ? [[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2]] : [[1, 2], [2, 1], [1, 1]]);
  const [r, w] = rng.pick(difficulty > 1 ? [[1, 1], [1, 2], [2, 1], [1, 3]] : [[1, 1]]);
  const k = rng.pick(difficulty > 1 ? [R(1), R(2), R(3), R(1, 2)] : [R(1), R(2)]);
  const s = k.d === 2 ? rng.pick([2, 4]) : rng.pick([1, 2, 3]);
  return { k, s, t: rng.pick([1, 2, 3]), m, n, r, w };
}

const ratioWords = (x: string, mid: string, y: string, p: number, q: number) =>
  p === q ? `$${mid}$ is the midpoint of $${x}${y}$` : `$${mid}$ lies on $${x}${y}$ with $${x}${mid} : ${mid}${y} = ${p} : ${q}$`;

function shapePoints(sc: ShapeScene): Record<ShapeRole, Pt> {
  const A = vec(sc.s, 0);
  const C = vec(0, sc.t);
  const B = vAdd(C, vScale(A, sc.k));
  const P = vAdd(A, vScale(vSub(B, A), R(sc.m, sc.m + sc.n)));
  const Q = vAdd(C, vScale(vSub(B, C), R(sc.r, sc.r + sc.w)));
  return {
    O: { name: 'O', pos: vec(0, 0) },
    A: { name: 'A', pos: A },
    C: { name: 'C', pos: C },
    B: { name: 'B', pos: B, derive: `${arrow('O', 'C')} + ${arrow('C', 'B')}` },
    P: {
      name: 'P',
      pos: P,
      derive: `${vt(A)} + ${termTex(R(sc.m, sc.m + sc.n), `\\left(${vt(vSub(B, A))}\\right)`)}`,
    },
    Q: {
      name: 'Q',
      pos: Q,
      derive: `${vt(C)} + ${termTex(R(sc.r, sc.r + sc.w), `\\left(${vt(vSub(B, C))}\\right)`)}`,
    },
  };
}

function shapePrompt(sc: ShapeScene, used: ShapeRole[], dashed: [ShapeRole, ShapeRole][]): Block[] {
  const pts = shapePoints(sc);
  const para = rEq(sc.k, R(1));
  const len = para ? 160 : rVal(sc.k) > 1 ? 200 / (rVal(sc.k) + 0.4) : 170;
  const toScreen = (p: V): P2 => [(rVal(p.a) / sc.s) * len + (rVal(p.b) / sc.t) * 55, (rVal(p.b) / sc.t) * 110];
  const at = (r: ShapeRole) => toScreen(pts[r].pos);
  const extras = (['P', 'Q'] as ShapeRole[]).filter((r) => used.includes(r));
  const cb = vScale(pts.A.pos, sc.k);
  const caption: string[] = [];
  if (extras.includes('P') && sc.m !== sc.n) caption.push(`AP : PB = ${sc.m} : ${sc.n}`);
  if (extras.includes('Q') && sc.r !== sc.w) caption.push(`CQ : QB = ${sc.r} : ${sc.w}`);
  const ticks = [];
  if (extras.includes('P') && sc.m === sc.n) ticks.push({ from: at('A'), to: at('P'), count: 1 }, { from: at('P'), to: at('B'), count: 1 });
  if (extras.includes('Q') && sc.r === sc.w) ticks.push({ from: at('C'), to: at('Q'), count: 2 }, { from: at('Q'), to: at('B'), count: 2 });
  const svg = figureSvg({
    dots: (['O', 'A', 'B', 'C', ...extras] as ShapeRole[]).map((r) => ({ name: pts[r].name, at: at(r) })),
    lines: [
      { from: at('A'), to: at('B') },
      ...(para ? [{ from: at('C'), to: at('B') }] : []),
      ...dashed.map(([p, q]) => ({ from: at(p), to: at(q), dashed: true })),
    ],
    arrows: [
      { from: at('O'), to: at('A'), label: vecLabel(sc.s, 'a') },
      { from: at('O'), to: at('C'), label: vecLabel(sc.t, 'b') },
      ...(para ? [] : [{ from: at('C'), to: at('B'), label: vecLabel(rVal(cb.a), 'a') }]),
    ],
    ticks,
    caption,
    aria: para ? 'Parallelogram OABC with the points the question names' : 'Trapezium OABC with the points the question names',
  });
  const intro = para
    ? `$OABC$ is a parallelogram with $${arrow('O', 'A')} = ${vt(pts.A.pos)}$ and $${arrow('O', 'C')} = ${vt(pts.C.pos)}$.`
    : `$OABC$ is a trapezium with $${arrow('O', 'A')} = ${vt(pts.A.pos)}$, $${arrow('O', 'C')} = ${vt(pts.C.pos)}$ and $${arrow('C', 'B')} = ${vt(cb)}$.`;
  const points = extras.map((r) => (r === 'P' ? ratioWords('A', 'P', 'B', sc.m, sc.n) : ratioWords('C', 'Q', 'B', sc.r, sc.w)));
  return [
    { kind: 'diagram', svg },
    { kind: 'prose', text: `${intro}${points.length ? ` ${points.join(', and ')}.` : ''}` },
  ];
}

interface ShapeParams extends ShapeScene {
  from: ShapeRole;
  to: ShapeRole;
}

const SHAPE_PAIRS = pairsOf(SHAPE_ROLES, ['OA', 'OC', 'CB'], (x, y) => ['P', 'Q'].includes(x) || ['P', 'Q'].includes(y) || `${x}${y}` === 'OB' || `${x}${y}` === 'AC' || `${x}${y}` === 'CA' || `${x}${y}` === 'AB');

function sampleShape(rng: Rng, difficulty: number): ShapeParams {
  const [from, to] = rng.pick(SHAPE_PAIRS);
  return { ...sampleShapeScene(rng, difficulty), from, to };
}

function shapeIntro(sc: ShapeScene): SolutionStep[] {
  const para = rEq(sc.k, R(1));
  const pts = shapePoints(sc);
  return [
    {
      text: para
        ? `In a parallelogram opposite sides are equal and parallel, so $${arrow('C', 'B')} = ${arrow('O', 'A')}$. Find the sides you need first.`
        : `$${arrow('C', 'B')}$ is given. Find the sides you need first.`,
    },
    { tex: `${arrow('C', 'B')} = ${vt(vSub(pts.B.pos, pts.C.pos))}` },
    { tex: `${arrow('A', 'B')} = ${arrow('O', 'C')} + ${arrow('C', 'B')} - ${arrow('O', 'A')} = ${vt(vSub(pts.B.pos, pts.A.pos))}` },
  ];
}

/** A vector in a parallelogram or trapezium with points cut in a ratio. */
const shapeRoute: Generator<ShapeParams> = {
  id: 'vproof-shape-route',
  sample: sampleShape,
  render: (params) => {
    const pts = shapePoints(params);
    return routeSlide(shapePrompt(params, [params.from, params.to], [[params.from, params.to]]), pts[params.from], pts[params.to]);
  },
  choices: (params) => {
    const pts = shapePoints(params);
    return steer(vectorChoices(between(pts[params.from], pts[params.to])), JSON.stringify(params));
  },
  solution: (params) => {
    const pts = shapePoints(params);
    return routeSolution('O', pts[params.from], pts[params.to], shapeIntro(params));
  },
};

/** The same vector, its two coefficients placed as tiles. */
const shapeCoeffs: Generator<ShapeParams> = {
  id: 'vproof-shape-coeffs',
  sample: sampleShape,
  render: (params) => {
    const pts = shapePoints(params);
    const v = between(pts[params.from], pts[params.to]);
    return {
      kind: 'tiles',
      prompt: [
        ...shapePrompt(params, [params.from, params.to], [[params.from, params.to]]),
        {
          kind: 'prose',
          text: `Write $${arrow(pts[params.from].name, pts[params.to].name)}$ as $\\lambda\\mathbf{a} + \\mu\\mathbf{b}$ by placing the two numbers.`,
        },
      ],
      template: '\\lambda: \\; {0} \\qquad \\mu: \\; {1}',
      bank: ratioBank([v.a, v.b], [rNeg(v.a), rNeg(v.b), rMul(v.a, R(2)), rMul(v.b, R(1, 2))]),
      answer: [ratioTex(v.a), ratioTex(v.b)],
    };
  },
  solution: (params) => {
    const pts = shapePoints(params);
    const v = between(pts[params.from], pts[params.to]);
    return [
      ...routeSolution('O', pts[params.from], pts[params.to], shapeIntro(params)),
      { text: `So $\\lambda = ${ratioTex(v.a)}$ and $\\mu = ${ratioTex(v.b)}$.` },
    ];
  },
};

type HexRole = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'O' | 'M';
const HEX_VERTICES: HexRole[] = ['A', 'B', 'C', 'D', 'E', 'F'];

interface HexParams {
  from: HexRole;
  to: HexRole;
  /** M is the midpoint of this side, named by its first vertex (C for CD). */
  side: number;
}

/** Sides M may halve: CD, DE, EF, FA. */
const HEX_SIDES: [HexRole, HexRole][] = [
  ['C', 'D'],
  ['D', 'E'],
  ['E', 'F'],
  ['F', 'A'],
];

function hexPoints(side: number): Record<HexRole, Pt> {
  const pos: Record<Exclude<HexRole, 'M'>, V> = {
    A: vec(0, 0),
    B: vec(1, 0),
    C: vec(1, 1),
    D: vec(0, 2),
    E: vec(-1, 2),
    F: vec(-1, 1),
    O: vec(0, 1),
  };
  const [u, v] = HEX_SIDES[side];
  return {
    A: { name: 'A', pos: pos.A },
    B: { name: 'B', pos: pos.B },
    C: { name: 'C', pos: pos.C, derive: `${arrow('A', 'B')} + ${arrow('B', 'C')}` },
    D: { name: 'D', pos: pos.D, derive: `2${arrow('B', 'C')}` },
    E: { name: 'E', pos: pos.E, derive: `${arrow('A', 'D')} + ${arrow('D', 'E')}` },
    F: { name: 'F', pos: pos.F, derive: `${arrow('A', 'E')} + ${arrow('E', 'F')}` },
    O: { name: 'O', pos: pos.O, derive: `\\frac{1}{2}${arrow('A', 'D')}` },
    M: {
      name: 'M',
      pos: vScale(vAdd(pos[u as Exclude<HexRole, 'M'>], pos[v as Exclude<HexRole, 'M'>]), R(1, 2)),
      derive: `\\frac{1}{2}\\left(${arrow('A', u)} + ${arrow('A', v)}\\right)`,
    },
  };
}

const HEX_PAIRS: Record<1 | 2, [HexRole, HexRole][]> = {
  1: pairsOf<HexRole>([...HEX_VERTICES, 'O'], ['AB', 'BC'], () => true),
  2: pairsOf<HexRole>([...HEX_VERTICES, 'O', 'M'], ['AB', 'BC'], (x, y) => x === 'M' || y === 'M' || x === 'O' || y === 'O'),
};

function hexPrompt({ from, to, side }: HexParams): Block[] {
  const pts = hexPoints(side);
  const toScreen = (p: V): P2 => [rVal(p.a) * 60 + rVal(p.b) * 30, rVal(p.b) * 52];
  const at = (r: HexRole) => toScreen(pts[r].pos);
  const usesM = from === 'M' || to === 'M';
  const usesO = from === 'O' || to === 'O';
  const ring = [...HEX_VERTICES, 'A'] as HexRole[];
  const [u, v] = HEX_SIDES[side];
  const svg = figureSvg({
    dots: [...HEX_VERTICES, ...(usesO ? ['O' as HexRole] : []), ...(usesM ? ['M' as HexRole] : [])].map((r) => ({
      name: pts[r].name,
      at: at(r),
    })),
    lines: [
      ...ring.slice(2, -1).map((r, idx) => ({ from: at(r), to: at(ring[idx + 3]) })),
      { from: at(from), to: at(to), dashed: true },
    ],
    arrows: [
      { from: at('A'), to: at('B'), label: vecLabel(1, 'a') },
      { from: at('B'), to: at('C'), label: vecLabel(1, 'b') },
    ],
    ticks: usesM
      ? [
          { from: at(u), to: at('M'), count: 1 },
          { from: at('M'), to: at(v), count: 1 },
        ]
      : [],
    aria: 'Regular hexagon ABCDEF',
  });
  const mid = usesM ? ` $M$ is the midpoint of $${u}${v}$.` : '';
  return [
    { kind: 'diagram', svg },
    {
      kind: 'prose',
      text: `$ABCDEF$ is a regular hexagon${usesO ? ' with centre $O$' : ''}. $${arrow('A', 'B')} = \\mathbf{a}$ and $${arrow('B', 'C')} = \\mathbf{b}$.${mid}`,
    },
  ];
}

const HEX_FACTS: SolutionStep = {
  text: 'In a regular hexagon opposite sides are equal and parallel, so $\\overrightarrow{DE} = -\\mathbf{a}$ and $\\overrightarrow{EF} = -\\mathbf{b}$. The long diagonal $AD$ is twice $BC$, and the centre $O$ is halfway along it.',
};

/** A vector in a regular hexagon, in terms of two neighbouring sides. */
const hexagon: Generator<HexParams> = {
  id: 'vproof-hexagon',
  sample: (rng, difficulty) => {
    const [from, to] = rng.pick(HEX_PAIRS[difficulty > 1 ? 2 : 1]);
    return { from, to, side: rng.int(0, 3) };
  },
  render: (params) => {
    const pts = hexPoints(params.side);
    return routeSlide(hexPrompt(params), pts[params.from], pts[params.to]);
  },
  choices: (params) => {
    const pts = hexPoints(params.side);
    return steer(vectorChoices(between(pts[params.from], pts[params.to])), JSON.stringify(params));
  },
  solution: (params) => {
    const pts = hexPoints(params.side);
    return routeSolution('A', pts[params.from], pts[params.to], [HEX_FACTS]);
  },
};

type QuadShape = 'parallelogram' | 'trapezium' | 'neither';

interface QuadParams {
  oa: V;
  oc: V;
  shape: QuadShape;
  k: number;
  e: V;
}

/** CB for each shape: OA again, a multiple of it, or neither. */
const quadCB = ({ oa, shape, k, e }: QuadParams): V =>
  shape === 'parallelogram' ? oa : shape === 'trapezium' ? vScale(oa, R(k)) : vAdd(oa, e);

const EQUAL = 'Equal to it';
const MULTIPLE = 'A multiple of it, but not equal';
const NEITHER = 'Not a multiple of it';

/** Is OABC a parallelogram, a trapezium, or neither? From three position vectors. */
const quadFlow: Generator<QuadParams> = {
  id: 'vproof-quad-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const oa = difficulty > 1 ? vec(rng.int(1, 3), rng.int(-1, 1)) : vec(rng.int(1, 3), 0);
      const oc = difficulty > 1 ? vec(rng.int(-1, 1), rng.int(1, 3)) : vec(rng.int(0, 1), rng.int(1, 3));
      if (factorOf(oa, oc)) continue;
      const e = rng.pick([vec(0, 1), vec(0, -1), vec(1, 1), vec(-1, 1)]);
      const params: QuadParams = {
        oa,
        oc,
        shape: rng.pick(['parallelogram', 'trapezium', 'neither'] as QuadShape[]),
        k: rng.pick([2, 3]),
        e,
      };
      // "Neither" must be neither: CB not along OA, and AB not along OC.
      if (params.shape === 'neither') {
        const cb = quadCB(params);
        if (factorOf(cb, oa) || factorOf(vAdd(oc, vSub(cb, oa)), oc)) continue;
      }
      return params;
    }
  },
  render: (params) => {
    const { oa, oc } = params;
    const cb = quadCB(params);
    const ob = vAdd(oc, cb);
    const key = JSON.stringify(params);
    const cbLabels = [vt(cb), ...vectorSlips(cb, [vSub(oc, ob), vAdd(ob, oc), vSub(ob, oa)]).map(vt)].map((t) => `$${t}$`);
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Is $OABC$ a parallelogram, a trapezium with $CB$ parallel to $OA$, or neither? Each answer decides what is asked next.',
        },
      ],
      subject: `\\begin{aligned} ${arrow('O', 'A')} &= ${vt(oa)} \\\\ ${arrow('O', 'B')} &= ${vt(ob)} \\\\ ${arrow('O', 'C')} &= ${vt(oc)} \\end{aligned}`,
      steps: [
        {
          id: 'cb',
          ask: `Which is $${arrow('C', 'B')}$?`,
          branches: turned(cbLabels, key).map((label) => ({ label, to: 'cmp' })),
        },
        {
          id: 'cmp',
          ask: `Compare it with $${arrow('O', 'A')}$.`,
          branches: [
            { label: EQUAL, outcome: 'A parallelogram: one pair of opposite sides is equal and parallel.' },
            { label: MULTIPLE, outcome: 'A trapezium: $CB$ is parallel to $OA$ but a different length.' },
            { label: NEITHER, outcome: 'Neither: $CB$ is not even parallel to $OA$.' },
          ],
        },
      ],
      answer: [cbLabels[0], params.shape === 'parallelogram' ? EQUAL : params.shape === 'trapezium' ? MULTIPLE : NEITHER],
    };
  },
  solution: (params) => {
    const { oa, oc } = params;
    const cb = quadCB(params);
    const ob = vAdd(oc, cb);
    return [
      { text: 'Find $\\overrightarrow{CB}$ as destination minus start, then compare it with the side opposite, $\\overrightarrow{OA}$.' },
      { tex: `${arrow('C', 'B')} = ${bk(ob, false)} - ${bk(oc, true)}` },
      ...(`${bk(ob, false)} - ${bk(oc, true)}` === vt(cb) ? [] : [{ tex: `${arrow('C', 'B')} = ${vt(cb)}` }]),
      params.shape === 'parallelogram'
        ? { text: `$${arrow('C', 'B')} = ${arrow('O', 'A')}$: equal and parallel, so $OABC$ is a parallelogram.` }
        : params.shape === 'trapezium'
          ? { text: `$${arrow('C', 'B')} = ${params.k}${arrow('O', 'A')}$: parallel but ${params.k} times as long, so $OABC$ is a trapezium.` }
          : { text: `No single number takes $${vt(oa)}$ to $${vt(cb)}$, so $CB$ is not parallel to $OA$ and $OABC$ is neither.` },
    ];
  },
};

/* ---------- lesson 5: where two lines cross ---------- */

/** `\frac{2}{3}\lambda`, `\lambda`, `-\mu`: a coefficient in front of a letter. */
const coefSym = (r: Ratio, sym: string) => kTex(r, sym);

interface CrossScene {
  kind: 'para' | 'tri';
  m: number;
  n: number;
  r: number;
  u: number;
  set: number;
}

const CROSS_NAMES: [string, string, string][] = [
  ['D', 'E', 'P'],
  ['M', 'N', 'X'],
  ['C', 'D', 'F'],
];

function sampleCrossScene(rng: Rng, difficulty: number): CrossScene {
  const pairs: [number, number][] = difficulty > 1 ? [[1, 1], [1, 2], [2, 1], [1, 3], [3, 1]] : [[1, 1], [1, 2], [2, 1]];
  const kind = rng.chance(difficulty > 1 ? 0.15 : 0.25) ? 'para' : 'tri';
  const [m, n] = rng.pick(pairs);
  const [r, u] = rng.pick(pairs);
  return { kind, m, n, r, u, set: rng.int(0, 2) };
}

/**
 * OD and AE for the scene, and where they cross. The parallelogram is the
 * same algebra with D at the far corner (a + b) and E at B.
 */
function crossParts(sc: CrossScene) {
  const para = sc.kind === 'para';
  const [dn, en, pn] = para ? ['C', 'B', CROSS_NAMES[sc.set][2]] : CROSS_NAMES[sc.set];
  const w: V = para ? vec(1, 1) : vec(R(sc.n, sc.m + sc.n), R(sc.m, sc.m + sc.n));
  const e = para ? R(1) : R(sc.r, sc.r + sc.u);
  const denom = rAdd(rMul(e, w.a), w.b);
  const lambda = rDiv(e, denom);
  const mu = rDiv(w.b, denom);
  return { para, dn, en, pn, w, e, lambda, mu };
}

function crossPrompt(sc: CrossScene): Block[] {
  const { para, dn, en, pn, w, e, lambda } = crossParts(sc);
  const O: P2 = [0, 0];
  const A: P2 = para ? [170, 0] : [200, 0];
  const B: P2 = para ? [55, 110] : [70, 130];
  const at = (v: V): P2 => [rVal(v.a) * A[0] + rVal(v.b) * B[0], rVal(v.a) * A[1] + rVal(v.b) * B[1]];
  const D = at(w);
  const E = at(vec(0, e));
  const P = at(vScale(w, lambda));
  const svg = figureSvg({
    dots: para
      ? [
          { name: 'O', at: O },
          { name: 'A', at: A },
          { name: 'B', at: B },
          { name: 'C', at: D },
          { name: pn, at: P },
        ]
      : [
          { name: 'O', at: O },
          { name: 'A', at: A },
          { name: 'B', at: B },
          { name: dn, at: D },
          { name: en, at: E },
          { name: pn, at: P },
        ],
    lines: para
      ? [
          { from: A, to: D },
          { from: B, to: D },
          { from: O, to: D, dashed: true },
          { from: A, to: B, dashed: true },
        ]
      : [
          { from: A, to: B },
          { from: O, to: D, dashed: true },
          { from: A, to: E, dashed: true },
        ],
    arrows: [
      { from: O, to: A, label: vecLabel(1, 'a') },
      { from: O, to: B, label: vecLabel(1, 'b') },
    ],
    ticks:
      !para && sc.m === sc.n
        ? [
            { from: A, to: D, count: 1 },
            { from: D, to: B, count: 1 },
          ]
        : [],
    caption: para
      ? []
      : [...(sc.m === sc.n ? [] : [`A${dn} : ${dn}B = ${sc.m} : ${sc.n}`]), `O${en} : ${en}B = ${sc.r} : ${sc.u}`],
    aria: para ? 'Parallelogram OACB with its diagonals crossing' : 'Triangle OAB with two lines crossing inside it',
  });
  const text = para
    ? `$OACB$ is a parallelogram with $${arrow('O', 'A')} = \\mathbf{a}$ and $${arrow('O', 'B')} = \\mathbf{b}$. Its diagonals $OC$ and $AB$ cross at $${pn}$.`
    : `$${arrow('O', 'A')} = \\mathbf{a}$ and $${arrow('O', 'B')} = \\mathbf{b}$. ${ratioWords('A', dn, 'B', sc.m, sc.n)}, and $${en}$ lies on $OB$ with $O${en} : ${en}B = ${sc.r} : ${sc.u}$. The lines $O${dn}$ and $A${en}$ cross at $${pn}$.`;
  return [
    { kind: 'diagram', svg },
    { kind: 'prose', text },
  ];
}

function crossSolution(sc: CrossScene): SolutionStep[] {
  const { para, dn, en, pn, w, e, lambda, mu } = crossParts(sc);
  const ae = vec(-1, e);
  const lamLine = [coefSym(w.a, '\\lambda\\mathbf{a}'), `${w.b.n < 0 ? '-' : '+'} ${coefSym(rAbs(w.b), '\\lambda\\mathbf{b}')}`].join(' ');
  const muLine = `\\left(1 - \\mu\\right)\\mathbf{a} + ${coefSym(e, '\\mu\\mathbf{b}')}`;
  const ratioMu = rDiv(w.b, e);
  return [
    { text: `Write $${arrow('O', pn)}$ two ways: along $O${dn}$, and from $A$ along $A${en}$.` },
    // One equals sign per line where a line would otherwise wrap on a phone.
    ...(para
      ? [{ tex: `${arrow('O', dn)} = \\mathbf{a} + \\mathbf{b}` }]
      : [
          { tex: `${arrow('O', dn)} = \\mathbf{a} + ${termTex(R(sc.m, sc.m + sc.n), '\\left(\\mathbf{b} - \\mathbf{a}\\right)')}` },
          { tex: `= ${vt(w)}` },
        ]),
    { tex: `${arrow('O', pn)} = \\lambda${arrow('O', dn)} = ${lamLine}` },
    { tex: `${arrow('A', en)} = ${vt(ae)}` },
    { tex: `${arrow('O', pn)} = \\mathbf{a} + \\mu${arrow('A', en)}` },
    { tex: `= ${muLine}` },
    { text: '$\\mathbf{a}$ and $\\mathbf{b}$ are not parallel, so the coefficients must match.' },
    { tex: `\\mathbf{a}: \\; ${coefSym(w.a, '\\lambda')} = 1 - \\mu` },
    { tex: `\\mathbf{b}: \\; ${coefSym(w.b, '\\lambda')} = ${coefSym(e, '\\mu')}` },
    { text: 'The second line gives $\\mu$ in terms of $\\lambda$; put that into the first.' },
    { tex: `\\mu = ${coefSym(ratioMu, '\\lambda')}` },
    { tex: `${coefSym(rAdd(w.a, ratioMu), '\\lambda')} = 1` },
    { tex: `\\lambda = ${ratioTex(lambda)} \\qquad \\mu = ${ratioTex(mu)}` },
  ];
}

interface CrossParams extends CrossScene {
  ask: 'lambda' | 'mu';
}

/** λ or μ where two lines in a triangle (or a parallelogram's diagonals) cross. */
const cross: Generator<CrossParams> = {
  id: 'vproof-cross',
  sample: (rng, difficulty) => ({ ...sampleCrossScene(rng, difficulty), ask: rng.pick(['lambda', 'mu'] as const) }),
  render: (params) => {
    const { dn, en, pn, lambda, mu } = crossParts(params);
    const lam = params.ask === 'lambda';
    return {
      kind: 'expression',
      prompt: [
        ...crossPrompt(params),
        {
          kind: 'prose',
          text: lam
            ? `$${arrow('O', pn)} = \\lambda${arrow('O', dn)}$. Find $\\lambda$.`
            : `$${arrow('A', pn)} = \\mu${arrow('A', en)}$. Find $\\mu$.`,
        },
      ],
      lead: lam ? '\\lambda =' : '\\mu =',
      keypad: FRACTION_KEYS,
      answer: ratioAnswer(lam ? lambda : mu),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: crossSolution,
};

/** A ratio p : q from a fraction of the way along, t = p / (p + q). */
function splitOf(t: Ratio): [number, number] {
  return [t.n, t.d - t.n];
}

/** The ratio the crossing cuts one of the lines in. */
const crossRatio: Generator<CrossParams> = {
  id: 'vproof-cross-ratio',
  sample: (rng, difficulty) => ({ ...sampleCrossScene(rng, difficulty), ask: rng.pick(['lambda', 'mu'] as const) }),
  render: (params) => {
    const { dn, en, pn, lambda, mu } = crossParts(params);
    const lam = params.ask === 'lambda';
    const [p, q] = splitOf(lam ? lambda : mu);
    const [start, end] = lam ? ['O', dn] : ['A', en];
    const label = (x: number, y: number) => `${x} : ${y}`;
    const wrong = [label(q, p), label(p, p + q), label(p + q, q), label(p + 1, q), label(1, 2), label(2, 1)];
    return {
      kind: 'choice',
      prompt: [
        ...crossPrompt(params),
        { kind: 'prose', text: `Find the ratio $${start}${pn} : ${pn}${end}$.` },
      ],
      ...placed(
        label(p, q),
        [...new Set(wrong)].filter((l) => l !== label(p, q)).slice(0, 3),
        JSON.stringify(params),
      ),
    };
  },
  solution: (params) => {
    const { dn, en, pn, lambda, mu } = crossParts(params);
    const lam = params.ask === 'lambda';
    const t = lam ? lambda : mu;
    const [p, q] = splitOf(t);
    const [start, end] = lam ? ['O', dn] : ['A', en];
    return [
      ...crossSolution(params),
      {
        text: `$${pn}$ is $${ratioTex(t)}$ of the way from $${start}$ to $${end}$, leaving $${ratioTex(rSub(R(1), t))}$ to go.`,
      },
      { tex: `${start}${pn} : ${pn}${end} = ${ratioTex(t)} : ${ratioTex(rSub(R(1), t))} = ${p} : ${q}` },
    ];
  },
};

interface CrossOrderParams extends CrossScene {
  picks: number[];
}

function crossChain(sc: CrossScene): { steps: string[]; pool: OrderStep[] } {
  const { dn, en, pn, w, e, lambda, mu } = crossParts(sc);
  const lamLine = [coefSym(w.a, '\\lambda\\mathbf{a}'), `+ ${coefSym(w.b, '\\lambda\\mathbf{b}')}`].join(' ');
  const muLine = `\\left(1 - \\mu\\right)\\mathbf{a} + ${coefSym(e, '\\mu\\mathbf{b}')}`;
  const steps = [
    `Along $O${dn}$: $${arrow('O', pn)} = \\lambda${arrow('O', dn)} = ${lamLine}$.`,
    `Via $A$ instead: $${arrow('O', pn)} = \\mathbf{a} + \\mu${arrow('A', en)} = ${muLine}$.`,
    `Compare coefficients: $${coefSym(w.a, '\\lambda')} = 1 - \\mu$ and $${coefSym(w.b, '\\lambda')} = ${coefSym(e, '\\mu')}$.`,
    `Solve together: $\\lambda = ${ratioTex(lambda)}$ and $\\mu = ${ratioTex(mu)}$.`,
  ];
  // Pairing the coefficients crosswise says nothing new when the two on the
  // left are equal, so that slip is a sign slip instead.
  const crossed = rEq(w.a, w.b)
    ? {
        text: `Compare coefficients: $${coefSym(w.a, '\\lambda')} = 1 + \\mu$ and $${coefSym(w.b, '\\lambda')} = ${coefSym(e, '\\mu')}$.`,
        why: 'Multiplying out gives $-\\mu\\mathbf{a}$, so the coefficient of $\\mathbf{a}$ is $1 - \\mu$.',
      }
    : {
        text: `Compare coefficients: $${coefSym(w.a, '\\lambda')} = ${coefSym(e, '\\mu')}$ and $${coefSym(w.b, '\\lambda')} = 1 - \\mu$.`,
        why: 'That pairs the coefficient of $\\mathbf{a}$ on one side with the coefficient of $\\mathbf{b}$ on the other.',
      };
  const pool: OrderStep[] = [
    crossed,
    {
      text: `Add the two expressions for $${arrow('O', pn)}$ together.`,
      why: 'The two expressions are set equal, not added.',
    },
    {
      text: `$${arrow('O', pn)} = ${arrow('O', dn)} + \\lambda\\mathbf{a}$.`,
      why: `$${pn}$ is a fraction of the way along $O${dn}$, so it is $\\lambda${arrow('O', dn)}$.`,
    },
  ];
  return { steps, pool };
}

/** Finding the crossing, put in order. */
const crossOrder: Generator<CrossOrderParams> = {
  id: 'vproof-cross-order',
  sample: (rng, difficulty) => ({
    ...sampleCrossScene(rng, difficulty),
    picks: rng.sample([0, 1, 2], difficulty > 1 ? 2 : 1),
  }),
  render: (params) => {
    const { steps: proof, pool } = crossChain(params);
    const { pn } = crossParts(params);
    const { steps, answer } = orderBank(
      proof,
      params.picks.map((i) => pool[i].text),
    );
    return {
      kind: 'order',
      prompt: [
        ...crossPrompt(params),
        {
          kind: 'prose',
          text: `Find where the lines cross at $${pn}$. Tap the steps in order. ${params.picks.length === 1 ? 'One step does not belong.' : 'Two steps do not belong.'}`,
        },
      ],
      steps,
      answer,
    };
  },
  solution: (params) => {
    const { steps, pool } = crossChain(params);
    return [
      { text: 'Each step uses the one before it, so the working runs:' },
      ...steps.map((text, idx) => ({ text: `${idx + 1}. ${text}` })),
      ...params.picks.map((i) => ({ text: `Not part of it: “${pool[i].text}” ${pool[i].why}` })),
    ];
  },
};

interface CompareParams {
  form: 'simple' | 'cross';
  p: number;
  q: number;
  /** simple: λ as a fraction; cross: e as a fraction. */
  xn: number;
  xd: number;
}

function compareParts({ form, p, q, xn, xd }: CompareParams) {
  const x = R(xn, xd);
  if (form === 'simple') {
    const lambda = x;
    return { lambda, mu: rMul(lambda, R(q)), r: rMul(lambda, R(p)), e: R(1) };
  }
  const e = x;
  const denom = rAdd(rMul(e, R(p)), R(q));
  return { lambda: rDiv(e, denom), mu: rDiv(R(q), denom), r: R(0), e };
}

function compareTex(params: CompareParams): string {
  const { r, e } = compareParts(params);
  const left = `\\lambda\\left(${vt(vec(params.p, params.q))}\\right)`;
  if (params.form === 'simple') return `${left} = ${vt(vec(r, 0))} + \\mu\\mathbf{b}`;
  return `${left} = \\mathbf{a} + \\mu\\left(${termTex(e, '\\mathbf{b}')} - \\mathbf{a}\\right)`;
}

/** Comparing coefficients of a and b: λ and μ from one vector equation. */
const compare: Generator<CompareParams> = {
  id: 'vproof-compare',
  sample: (rng, difficulty) => {
    const form = rng.chance(0.5) ? 'simple' : 'cross';
    if (form === 'simple') {
      const [xn, xd] = rng.pick(difficulty > 1 ? [[2, 1], [3, 1], [-2, 1], [1, 2], [3, 2], [-1, 2]] : [[2, 1], [3, 1], [4, 1], [-2, 1], [-1, 1]]);
      const p = rng.pick(difficulty > 1 ? [-3, -2, 2, 3, 4] : [1, 2, 3]);
      const q = rng.pick(difficulty > 1 ? [-3, -2, -1, 1, 2, 3] : [-2, -1, 1, 2]);
      if (xd === 2 && p % 2 !== 0) return { form, p: p * 2, q, xn, xd };
      return { form, p, q, xn, xd };
    }
    const [xn, xd] = rng.pick(difficulty > 1 ? [[1, 1], [2, 1], [1, 2], [1, 3], [2, 3], [3, 1]] : [[1, 1], [2, 1], [3, 1]]);
    return { form, p: rng.pick(difficulty > 1 ? [1, 2, 3] : [1, 2]), q: rng.pick(difficulty > 1 ? [1, 2, 3] : [1, 2]), xn, xd };
  },
  render: (params) => {
    const { lambda, mu } = compareParts(params);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: '$\\mathbf{a}$ and $\\mathbf{b}$ are not parallel. Find $\\lambda$ and $\\mu$.' },
        { kind: 'display', tex: compareTex(params) },
      ],
      template: '\\lambda = {0} \\qquad \\mu = {1}',
      bank: ratioBank([lambda, mu], [rSub(R(1), lambda), rMul(lambda, R(2)), rNeg(mu), rAdd(mu, R(1))]),
      answer: [ratioTex(lambda), ratioTex(mu)],
    };
  },
  solution: (params) => {
    const { lambda, mu, r, e } = compareParts(params);
    const { p, q } = params;
    if (params.form === 'simple') {
      return [
        { text: 'Multiply out the left, then match the coefficient of $\\mathbf{a}$ on each side, and of $\\mathbf{b}$.' },
        { tex: `${coefSym(R(p), '\\lambda')}\\mathbf{a} ${q < 0 ? '-' : '+'} ${coefSym(R(Math.abs(q)), '\\lambda')}\\mathbf{b} = ${vt(vec(r, 0))} + \\mu\\mathbf{b}` },
        { tex: `\\mathbf{a}: \\; ${coefSym(R(p), '\\lambda')} = ${ratioTex(r)} \\implies \\lambda = ${ratioTex(lambda)}` },
        { tex: `\\mathbf{b}: \\; \\mu = ${coefSym(R(q), '\\lambda')} = ${ratioTex(mu)}` },
      ];
    }
    const ratioMu = rDiv(R(q), e);
    return [
      { text: 'Multiply out both sides, then match the coefficient of $\\mathbf{a}$ on each side, and of $\\mathbf{b}$.' },
      { tex: `${coefSym(R(p), '\\lambda')}\\mathbf{a} + ${coefSym(R(q), '\\lambda')}\\mathbf{b} = \\left(1 - \\mu\\right)\\mathbf{a} + ${coefSym(e, '\\mu')}\\mathbf{b}` },
      { tex: `\\mathbf{a}: \\; ${coefSym(R(p), '\\lambda')} = 1 - \\mu` },
      { tex: `\\mathbf{b}: \\; ${coefSym(R(q), '\\lambda')} = ${coefSym(e, '\\mu')}` },
      { text: 'The second gives $\\mu$ in terms of $\\lambda$; put it into the first.' },
      { tex: `\\mu = ${coefSym(ratioMu, '\\lambda')}` },
      { tex: `${coefSym(rAdd(R(p), ratioMu), '\\lambda')} = 1` },
      { tex: `\\lambda = ${ratioTex(lambda)} \\qquad \\mu = ${ratioTex(mu)}` },
    ];
  },
};

export const vectorProofsGenerators = [
  midRoute,
  midMultiple,
  midFlow,
  midOrder,
  multiple,
  parallelCheck,
  parallelRoute,
  parallelFlowGen,
  parallelOrderGen,
  collinearFlow,
  collinearOrder,
  splitRatio,
  collinearUnknown,
  shapeRoute,
  shapeCoeffs,
  hexagon,
  quadFlow,
  compare,
  cross,
  crossRatio,
  crossOrder,
];
