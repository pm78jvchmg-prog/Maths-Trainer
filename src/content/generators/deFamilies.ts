/**
 * Differential Equations, Families of Solutions.
 *
 * A first-order equation has a whole family of solutions, one for each value
 * of the constant. This level reads that family before solving anything: how
 * the constant moves a curve (added on) or stretches it (multiplying), which
 * equation every member shares, the one member a point picks out, the gradient
 * `dy/dx = f(x, y)` gives at a point without solving, the direction field
 * that gradient draws, its isoclines and flat segments, and the solution
 * followed through the field to an equilibrium.
 *
 * Four families carry the first two lessons, each with a whole constant:
 * `y = ax^n + C` (added on), and `y = Ae^{kx}`, `y = Ax^n` and `y = C/x`
 * (multiplying). A point is always drawn from the member, never the other way,
 * so the constant it picks is whole; `y = C/x` puts its point at an x that
 * divides C.
 *
 * The gradient lessons share one right-hand side model (`Rhs`): `px + qy + r`,
 * `pxy`, `px^2 + qy` and `py/x`, evaluated at whole points, with `py/x` drawn
 * only where x divides py. The field is drawn by `fieldSvg`, which keeps
 * `plotSvg`'s geometry (280 wide, inset 12) and records its window in
 * `data-plot`, so a slider over a field takes its marker window from
 * `plotFigure` exactly as a slider over a plotted curve does.
 *
 * Nothing here is a plain derivative or integral in x, so no slide declares
 * `source` or `integrand`: `deFamilies.test.ts` checks every member against
 * its family's equation with mathjs, and recomputes every value, point,
 * isocline and equilibrium from the parameters.
 */
import type { Block, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { plotFigure, plotSvg } from '../figures';
import { ALGEBRA_KEYS, sumTex, termTex } from './calculus';
import { mix, numberChoices, stepBank, tokenBank, treeBank, turned } from './parametricImplicit';

/* ---------- Shared helpers ---------- */

const prose = (text: string): Block => ({ kind: 'prose', text });
const display = (tex: string): Block => ({ kind: 'display', tex });

const DYDX = '\\frac{dy}{dx}';

/** Lines of working stacked in one display, aligned on their `&`. */
const chain = (...lines: string[]): string => `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;

/** A point as the learner reads it. */
export const pointTex = (x: number | string, y: number | string): string => `(${x}, ${y})`;

/** A number in a substitution: negatives in brackets. */
const num = (v: number): string => (v < 0 ? `(${v})` : `${v}`);

/** A coefficient on a letter: 1 and -1 implied. */
const coefOn = (c: number, letter: string): string =>
  c === 0 ? '0' : c === 1 ? letter : c === -1 ? `-${letter}` : `${c}${letter}`;

/** `(y - 3)` or `(y + 2)`, or `y` alone for 0. */
const yLess = (a: number): string => (a === 0 ? 'y' : a > 0 ? `(y - ${a})` : `(y + ${-a})`);

/** A choice slide written directly, turned by a salt so the answer moves. */
interface Pick {
  label: string;
  tex?: boolean;
  correct?: boolean;
}

function choiceSlide(prompt: Block[], picks: Pick[], salt: number): Slide {
  const seen = new Set<string>();
  const kept = picks.filter((pick) => {
    if (seen.has(pick.label)) return false;
    seen.add(pick.label);
    return true;
  });
  const ordered = turned(kept, salt % kept.length);
  return {
    kind: 'choice',
    prompt,
    options: ordered.map((pick, idx) => ({ id: `opt${idx}`, label: pick.label, tex: pick.tex })),
    correctId: `opt${ordered.findIndex((pick) => pick.correct)}`,
  };
}

/* ============================================================
 * The direction field
 * ============================================================ */

const WIDTH = 280;
const PAD = 12;

export interface FieldOptions {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  /** The gradient at a point. */
  f: (x: number, y: number) => number;
  /** Only these points get a segment; every whole point when omitted. */
  at?: [number, number][];
  /** Solution curves y(x) drawn over the field. */
  curves?: { f: (x: number) => number; dashed?: boolean; accent?: boolean }[];
  horizontals?: number[];
  /** Dashed vertical lines. */
  verticals?: number[];
  marks?: { x: number; y: number }[];
  /** Defaults to the height that keeps one unit the same length both ways. */
  height?: number;
  label: string;
}

/**
 * A direction field: a short segment at each whole point, at the gradient the
 * equation gives there.
 *
 * The segment's slope is worked out in the picture's own pixels, so with
 * unequal scales it is still the slope a solution curve drawn on the same axes
 * has there. Colours come from `currentColor`. Nothing is written as SVG
 * text; a label belongs in the prose around the figure.
 */
export function fieldSvg(options: FieldOptions): string {
  const { xMin, xMax, yMin, yMax, f, curves = [], horizontals = [], verticals = [], marks = [], label } = options;
  const height = options.height ?? Math.round(2 * PAD + ((WIDTH - 2 * PAD) * (yMax - yMin)) / (xMax - xMin));
  const sx = (WIDTH - 2 * PAD) / (xMax - xMin);
  const sy = (height - 2 * PAD) / (yMax - yMin);
  const px = (x: number) => PAD + (x - xMin) * sx;
  const py = (y: number) => PAD + (yMax - y) * sy;
  const clip = `field-clip-${height}`;
  const parts = [
    `<svg viewBox="0 0 ${WIDTH} ${height}" width="100%" role="img" aria-label="${label}" data-plot="${xMin} ${xMax} ${yMin} ${yMax}">`,
    `<clipPath id="${clip}"><rect x="${PAD}" y="${PAD}" width="${WIDTH - 2 * PAD}" height="${height - 2 * PAD}" /></clipPath>`,
  ];
  if (yMin <= 0 && yMax >= 0) {
    parts.push(`<line x1="${PAD}" y1="${py(0).toFixed(1)}" x2="${WIDTH - PAD}" y2="${py(0).toFixed(1)}" stroke="currentColor" stroke-width="1" opacity="0.55" />`);
  }
  if (xMin <= 0 && xMax >= 0) {
    parts.push(`<line x1="${px(0).toFixed(1)}" y1="${PAD}" x2="${px(0).toFixed(1)}" y2="${height - PAD}" stroke="currentColor" stroke-width="1" opacity="0.55" />`);
  }
  for (const y of horizontals) {
    parts.push(`<line x1="${PAD}" y1="${py(y).toFixed(1)}" x2="${WIDTH - PAD}" y2="${py(y).toFixed(1)}" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.6" />`);
  }
  for (const x of verticals) {
    parts.push(`<line x1="${px(x).toFixed(1)}" y1="${PAD}" x2="${px(x).toFixed(1)}" y2="${height - PAD}" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.7" />`);
  }
  const points: [number, number][] = options.at ?? [];
  if (!options.at) {
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x += 1) {
      for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y += 1) points.push([x, y]);
    }
  }
  const half = 8;
  for (const [x, y] of points) {
    const m = f(x, y);
    if (!Number.isFinite(m)) continue;
    const dx = sx;
    const dy = -m * sy;
    const size = Math.hypot(dx, dy);
    const ux = (dx / size) * half;
    const uy = (dy / size) * half;
    const cx = px(x);
    const cy = py(y);
    parts.push(
      `<line x1="${(cx - ux).toFixed(1)}" y1="${(cy - uy).toFixed(1)}" x2="${(cx + ux).toFixed(1)}" y2="${(cy + uy).toFixed(1)}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />`,
    );
  }
  if (curves.length > 0) {
    parts.push(`<g clip-path="url(#${clip})">`);
    const samples = 160;
    for (const curve of curves) {
      const pieces: string[] = [];
      let pen = false;
      for (let i = 0; i <= samples; i += 1) {
        const x = xMin + ((xMax - xMin) * i) / samples;
        const y = curve.f(x);
        if (!Number.isFinite(y) || y > yMax + 50 || y < yMin - 50) {
          pen = false;
          continue;
        }
        pieces.push(`${pen ? 'L' : 'M'} ${px(x).toFixed(1)},${py(y).toFixed(1)}`);
        pen = true;
      }
      const dash = curve.dashed ? ' stroke-dasharray="5 4" opacity="0.6"' : '';
      const stroke = curve.accent ? 'class="plot-accent" ' : '';
      parts.push(`<path ${stroke}fill="none" stroke="currentColor" stroke-width="2"${dash} d="${pieces.join(' ')}" />`);
    }
    parts.push('</g>');
  }
  for (const mark of marks) {
    parts.push(`<circle cx="${px(mark.x).toFixed(1)}" cy="${py(mark.y).toFixed(1)}" r="4" fill="currentColor" stroke="currentColor" stroke-width="2" />`);
  }
  parts.push('</svg>');
  return parts.join('');
}

/* ============================================================
 * Families of curves
 * ============================================================ */

/**
 * A family with one constant.
 *
 * - `add`: y = a x^n + C, the constant added on.
 * - `exp`: y = A e^{a x}.
 * - `pow`: y = A x^n.
 * - `inv`: y = C / x.
 */
export type FamKind = 'add' | 'exp' | 'pow' | 'inv';

export interface Family {
  kind: FamKind;
  a: number;
  n: number;
}

/** The constant's letter: C when it is added or on top of a fraction, A when it multiplies. */
export const letterOf = (fam: Family): string => (fam.kind === 'exp' || fam.kind === 'pow' ? 'A' : 'C');

/** `e^{2x}`, `e^{-x}`. */
const expPart = (k: number): string => `e^{${coefOn(k, 'x')}}`;

/** The part the constant multiplies, or is added to. */
export function restTex(fam: Family): string {
  switch (fam.kind) {
    case 'add':
      return termTex(fam.a, fam.n);
    case 'exp':
      return expPart(fam.a);
    case 'pow':
      return `x^{${fam.n}}`;
    case 'inv':
      return '\\frac{1}{x}';
  }
}

export function familyTex(fam: Family): string {
  switch (fam.kind) {
    case 'add':
      return `y = ${termTex(fam.a, fam.n)} + C`;
    case 'exp':
      return `y = A${expPart(fam.a)}`;
    case 'pow':
      return `y = Ax^{${fam.n}}`;
    case 'inv':
      return 'y = \\frac{C}{x}';
  }
}

/** One member, with the constant put in. */
export function memberTex(fam: Family, c: number): string {
  switch (fam.kind) {
    case 'add':
      return `y = ${sumTex([termTex(fam.a, fam.n), `${c}`])}`;
    case 'exp':
      return `y = ${c === 1 ? '' : c === -1 ? '-' : c}${expPart(fam.a)}`;
    case 'pow':
      return `y = ${termTex(c, fam.n)}`;
    case 'inv':
      return c < 0 ? `y = -\\frac{${-c}}{x}` : `y = \\frac{${c}}{x}`;
  }
}

/** A member for mathjs, in x. */
export function memberAnswer(fam: Family, c: number): string {
  switch (fam.kind) {
    case 'add':
      return `(${fam.a})*x^(${fam.n}) + (${c})`;
    case 'exp':
      return `(${c})*e^((${fam.a})*x)`;
    case 'pow':
      return `(${c})*x^(${fam.n})`;
    case 'inv':
      return `(${c})/x`;
  }
}

export function memberValue(fam: Family, c: number, x: number): number {
  switch (fam.kind) {
    case 'add':
      return fam.a * x ** fam.n + c;
    case 'exp':
      return c * Math.exp(fam.a * x);
    case 'pow':
      return c * x ** fam.n;
    case 'inv':
      return c / x;
  }
}

/** The equation every member satisfies, as the learner reads its right-hand side. */
export function familyDeRhsTex(fam: Family): string {
  switch (fam.kind) {
    case 'add':
      return termTex(fam.n * fam.a, fam.n - 1);
    case 'exp':
      return coefOn(fam.a, 'y');
    case 'pow':
      return `\\frac{${fam.n}y}{x}`;
    case 'inv':
      return '-\\frac{y}{x}';
  }
}

/** The same right-hand side for mathjs, in x and y. */
export function familyDeRhsAnswer(fam: Family): string {
  switch (fam.kind) {
    case 'add':
      return `(${fam.n * fam.a})*x^(${fam.n - 1})`;
    case 'exp':
      return `(${fam.a})*y`;
    case 'pow':
      return `(${fam.n})*y/x`;
    case 'inv':
      return '-y/x';
  }
}

/** Working that shows the constant disappearing. */
function familyDeWorking(fam: Family): string {
  switch (fam.kind) {
    case 'add':
      return chain(`y &= ${termTex(fam.a, fam.n)} + C`, `${DYDX} &= ${termTex(fam.n * fam.a, fam.n - 1)}`);
    case 'exp':
      return chain(`y &= A${expPart(fam.a)}`, `${DYDX} &= ${fam.a === 1 ? '' : fam.a === -1 ? '-' : fam.a}A${expPart(fam.a)}`, `&= ${coefOn(fam.a, 'y')}`);
    case 'pow':
      return chain(`y &= Ax^{${fam.n}}`, `${DYDX} &= ${fam.n}A${fam.n === 2 ? 'x' : `x^{${fam.n - 1}}`}`, `&= \\frac{${fam.n}Ax^{${fam.n}}}{x} = \\frac{${fam.n}y}{x}`);
    case 'inv':
      return chain('y &= \\frac{C}{x}', `${DYDX} &= -\\frac{C}{x^{2}}`, '&= -\\frac{C}{x} \\times \\frac{1}{x} = -\\frac{y}{x}');
  }
}

/** Small additive families: a x^n with n up to `maxN`. */
function sampleAdd(rng: Rng, coefficients: number[], maxN: number): Family {
  const n = rng.int(1, maxN);
  const a = n === 3 ? rng.pick([1, -1]) : rng.pick(coefficients);
  return { kind: 'add', a, n };
}

function sampleMultiplying(rng: Rng): Family {
  const kind = rng.pick<FamKind>(['exp', 'pow', 'inv']);
  if (kind === 'exp') return { kind, a: rng.pick([1, 2, 3, -1, -2]), n: 0 };
  if (kind === 'pow') return { kind, a: 1, n: rng.pick([2, 3]) };
  return { kind, a: 1, n: -1 };
}

const famIndex = (fam: Family): number => ['add', 'exp', 'pow', 'inv'].indexOf(fam.kind);

/* ---------- Lesson 1: reading a member ---------- */

export interface ReadParams {
  fam: Family;
  c: number;
}

/** The solid member's constant, read off where it crosses the y-axis. */
const deFamRead: Generator<ReadParams> = {
  id: 'de-fam-read',
  sample: (rng, difficulty) => {
    if (difficulty >= 2 && rng.chance(0.4)) {
      return { fam: { kind: 'exp', a: rng.pick([1, 2, -1, -2]), n: 0 }, c: rng.int(1, 9) };
    }
    const fam = sampleAdd(rng, difficulty >= 2 ? [1, 2, 3, -1, -2, -3] : [1, 2, -1, -2], 3);
    let c = 0;
    while (c === 0) c = rng.int(-7, 7);
    return { fam, c };
  },
  render: ({ fam, c }): Slide => {
    const L = letterOf(fam);
    const exp = fam.kind === 'exp';
    const others = (exp ? [c + 3, c - 3, c + 5] : [c + 4, c - 4, c + 7, c - 7])
      .filter((other) => (exp ? other >= 1 && other <= 10 : Math.abs(other) <= 9))
      .slice(0, 2);
    return {
      kind: 'slider',
      prompt: [
        prose('The solid curve and the two dashed ones are members of the family'),
        display(familyTex(fam)),
        prose(`Slide to the solid curve's value of $${L}$.`),
      ],
      min: exp ? 0 : -9,
      max: exp ? 10 : 9,
      step: 1,
      answer: c,
      readout: `${L} = {v}`,
      figure: plotFigure(
        plotSvg({
          xMin: exp ? -1.5 : -2,
          xMax: exp ? 1.5 : 2,
          yMin: exp ? -1 : -10,
          yMax: exp ? 12 : 10,
          curves: [
            ...others.map((other) => ({ f: (x: number) => memberValue(fam, other, x), dashed: true })),
            { f: (x: number) => memberValue(fam, c, x), accent: true },
          ],
          verticals: [{ x: 0, dashed: false }],
          label: `Members of a family of curves, one drawn solid, crossing the y-axis at ${c}`,
        }),
        'y',
      ),
    };
  },
  solution: ({ fam, c }) => {
    const L = letterOf(fam);
    return [
      fam.kind === 'exp'
        ? { text: `At $x = 0$, $e^{0} = 1$, so every member has $y = A$ there: $A$ is where it crosses the $y$-axis.` }
        : { text: `At $x = 0$, $${termTex(fam.a, fam.n)}$ is $0$, so every member has $y = C$ there: $C$ is where it crosses the $y$-axis.` },
      { text: `The solid curve crosses at $${c}$.`, tex: `${L} = ${c}` },
      { text: 'So the solid curve is', tex: memberTex(fam, c) },
    ];
  },
};

/* ---------- Lesson 1: how the constant changes the curve ---------- */

export interface EffectParams {
  fam: Family;
  c1: number;
  c2: number;
}

const ADDED = 'Added on';
const TIMES = 'Multiplying the rest';

/** Stretched from the x-axis by a factor. */
const stretchLabel = (r: number): string => `Stretched from the $x$-axis, scale factor $${r}$`;
const movedLabel = (d: number): string => (d > 0 ? `Moved up by $${d}$` : `Moved down by $${-d}$`);

export function effectAnswer({ fam, c1, c2 }: EffectParams): [string, string] {
  if (fam.kind === 'add') return [ADDED, movedLabel(c2 - c1)];
  return [TIMES, stretchLabel(c2 / c1)];
}

const deFamEffect: Generator<EffectParams> = {
  id: 'de-fam-effect',
  sample: (rng, difficulty) => {
    if (difficulty >= 2 && rng.chance(0.55)) {
      for (;;) {
        const c1 = rng.int(1, 3);
        const r = rng.int(2, 4);
        // c2 - c1 is offered as a wrong scale factor, so it must differ from r.
        if (c1 * r - c1 === r) continue;
        return { fam: sampleMultiplying(rng), c1, c2: c1 * r };
      }
    }
    const fam = sampleAdd(rng, [1, 2, 3, -1, -2], difficulty >= 2 ? 3 : 2);
    const c1 = rng.int(-5, 5);
    let c2 = c1;
    while (c2 === c1) c2 = rng.int(-6, 6);
    return { fam, c1, c2 };
  },
  render: (params): Slide => {
    const { fam, c1, c2 } = params;
    const L = letterOf(fam);
    const added = fam.kind === 'add';
    const salt = mix(famIndex(fam), fam.a, fam.n, c1, c2);
    const d = c2 - c1;
    const what = added
      ? [
          { label: movedLabel(d), outcome: `Every height changes by $${d}$, so the whole curve moves ${d > 0 ? 'up' : 'down'} by $${Math.abs(d)}$.` },
          { label: movedLabel(-d), outcome: `$${c2}$ is ${d > 0 ? 'more' : 'less'} than $${c1}$, so every height goes ${d > 0 ? 'up' : 'down'}, not ${d > 0 ? 'down' : 'up'}.` },
          { label: `Moved right by $${Math.abs(d)}$`, outcome: `A change in $C$ changes the heights, not where things happen along the $x$-axis.` },
        ]
      : [
          { label: stretchLabel(c2 / c1), outcome: `Every height is multiplied by $${c2} \\div ${c1} = ${c2 / c1}$.` },
          { label: movedLabel(d), outcome: `Nothing is added: at $x$ where $${restTex(fam)}$ is small, the two curves are close together.` },
          { label: stretchLabel(d), outcome: `The scale factor compares by dividing: $${c2} \\div ${c1} = ${c2 / c1}$.` },
        ];
    return {
      kind: 'flow',
      prompt: [prose(`Compare the members with $${L} = ${c1}$ and $${L} = ${c2}$.`)],
      subject: familyTex(fam),
      steps: [
        {
          id: 'how',
          ask: `How does $${L}$ appear in the family?`,
          branches: turned(
            [
              added
                ? { label: ADDED, to: 'what' }
                : { label: ADDED, outcome: `$${L}$ multiplies $${restTex(fam)}$: nothing is added on.` },
              added
                ? { label: TIMES, outcome: `$C$ is added after $${restTex(fam)}$, not multiplied.` }
                : { label: TIMES, to: 'what' },
            ],
            salt % 2,
          ),
        },
        {
          id: 'what',
          ask: `So from $${L} = ${c1}$ to $${L} = ${c2}$ the curve is`,
          branches: turned(what, (salt >>> 4) % 3),
        },
      ],
      answer: effectAnswer(params),
    };
  },
  solution: ({ fam, c1, c2 }) => {
    const L = letterOf(fam);
    if (fam.kind === 'add') {
      return [
        { text: `$C$ is added on, so changing it adds the same amount to every height.` },
        { tex: `${c2} - ${num(c1)} = ${c2 - c1}` },
        { text: `The curve moves ${c2 > c1 ? 'up' : 'down'} by $${Math.abs(c2 - c1)}$: from $${memberTex(fam, c1)}$ to $${memberTex(fam, c2)}$.` },
      ];
    }
    return [
      { text: `$${L}$ multiplies $${restTex(fam)}$, so changing it multiplies every height by the same number.` },
      { tex: `${c2} \\div ${c1} = ${c2 / c1}` },
      { text: `The curve is stretched from the $x$-axis by scale factor $${c2 / c1}$.` },
    ];
  },
};

/* ---------- Lesson 1: the equation every member shares ---------- */

export interface EquationParams {
  fam: Family;
}

/** The right-hand sides offered: the right one first. */
export function equationOptions(fam: Family): string[] {
  const k = fam.a;
  switch (fam.kind) {
    case 'add': {
      const right = termTex(fam.n * fam.a, fam.n - 1);
      return [right, termTex(fam.a, fam.n - 1), termTex(fam.n * fam.a, fam.n), `${right} + C`, termTex(fam.a, fam.n + 1)];
    }
    case 'exp':
      return [coefOn(k, 'y'), coefOn(k, 'x'), sumTex(['y', `${k}`]), coefOn(-k, 'y')];
    case 'pow':
      return [`\\frac{${fam.n}y}{x}`, `\\frac{y}{${fam.n}x}`, `\\frac{${fam.n + 1}y}{x}`, `${fam.n}xy`];
    case 'inv':
      return ['-\\frac{y}{x}', '\\frac{y}{x}', '-\\frac{y}{x^{2}}', '-xy'];
  }
}

const deFamEquation: Generator<EquationParams> = {
  id: 'de-fam-equation',
  sample: (rng, difficulty) => {
    if (difficulty >= 2 && rng.chance(0.6)) return { fam: sampleMultiplying(rng) };
    const n = rng.int(1, 3);
    return { fam: { kind: 'add', a: rng.pick([1, 2, 3, 4, 5, -1, -2, -3, -4, -5]), n } };
  },
  render: ({ fam }): Slide => {
    const [right, ...wrong] = [...new Set(equationOptions(fam))];
    const picks: Pick[] = [
      { label: `${DYDX} = ${right}`, tex: true, correct: true },
      ...wrong.slice(0, 3).map((rhs) => ({ label: `${DYDX} = ${rhs}`, tex: true })),
    ];
    return choiceSlide(
      [prose('Every member of this family satisfies the same differential equation. Which one?'), display(familyTex(fam))],
      picks,
      mix(famIndex(fam), fam.a, fam.n),
    );
  },
  solution: ({ fam }) => {
    const L = letterOf(fam);
    return [
      { text: 'Differentiate the family.', tex: familyDeWorking(fam) },
      fam.kind === 'add'
        ? { text: `$C$ differentiates to $0$, so every member has the same gradient: $${DYDX} = ${familyDeRhsTex(fam)}$.` }
        : { text: `Write $${L}$'s part as $y$ again, and $${L}$ is gone: $${DYDX} = ${familyDeRhsTex(fam)}$ for every member.` },
    ];
  },
};

/* ---------- Lesson 1: the gap between two members ---------- */

export interface GapParams {
  fam: Family;
  c1: number;
  c2: number;
  x0: number;
}

export function gapValues({ fam, c1, c2, x0 }: GapParams): [number, number, number] {
  const y1 = memberValue(fam, c1, x0);
  const y2 = memberValue(fam, c2, x0);
  return [y1, y2, y2 - y1];
}

const deFamGapTree: Generator<GapParams> = {
  id: 'de-fam-gap-tree',
  sample: (rng, difficulty) => {
    const kind = difficulty >= 2 ? rng.pick<FamKind>(['add', 'pow', 'inv']) : 'add';
    if (kind === 'pow') {
      const c1 = rng.int(1, 3);
      return { fam: { kind, a: 1, n: 2 }, c1, c2: c1 + rng.int(1, 4), x0: rng.int(2, 3) };
    }
    if (kind === 'inv') {
      const x0 = rng.int(2, 4);
      const k1 = rng.int(1, 3);
      return { fam: { kind, a: 1, n: -1 }, c1: k1 * x0, c2: (k1 + rng.int(1, 4)) * x0, x0 };
    }
    const n = rng.int(1, 2);
    const fam: Family = { kind: 'add', a: rng.pick([1, 2, 3, -1, -2]), n };
    const c1 = rng.int(-5, 5);
    return { fam, c1, c2: c1 + rng.int(1, 6), x0: rng.int(1, n === 2 ? 3 : 4) };
  },
  render: (params): Slide => {
    const { fam, c1, c2, x0 } = params;
    const L = letterOf(fam);
    const answer = gapValues(params);
    const [y1, y2] = answer;
    return {
      kind: 'tree',
      prompt: [
        prose(
          `Take the members with $${L} = ${c1}$ and $${L} = ${c2}$. Fill in each height at $x = ${x0}$, then how far the second is above the first.`,
        ),
      ],
      expression: familyTex(fam),
      nodes: [
        { id: 'y1', from: [] },
        { id: 'y2', from: [] },
        { id: 'gap', from: ['y1', 'y2'] },
      ],
      bank: treeBank(answer, [y1 + y2, c2 - c1 + 1, memberValue(fam, 0, x0) || y2 + 1, answer[2] * 2]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { fam, c1, c2, x0 } = params;
    const [y1, y2, gap] = gapValues(params);
    const steps: SolutionStep[] = [
      { text: `Put $x = ${x0}$ into each member.`, tex: `${memberTex(fam, c1)} \\text{ gives } ${y1}` },
      { tex: `${memberTex(fam, c2)} \\text{ gives } ${y2}` },
      { text: 'Subtract.', tex: `${y2} - ${num(y1)} = ${gap}` },
    ];
    steps.push(
      fam.kind === 'add'
        ? { text: `That is $${c2} - ${num(c1)}$, the change in $C$: added on, it is the same gap at every $x$.` }
        : { text: `Multiplying, the gap is not the same at every $x$: it grows where the curves are tall.` },
    );
    return steps;
  },
};

/* ============================================================
 * Lesson 2: the member through a point
 * ============================================================ */

export interface MemberParams {
  fam: Family;
  c: number;
  x1: number;
}

/** The point's y, as the learner reads it: `5e^{2}` for an exponential at x = 1. */
export function memberYTex({ fam, c, x1 }: MemberParams): string {
  if (fam.kind === 'exp' && x1 !== 0) return `${c === 1 ? '' : c}e^{${fam.a * x1}}`;
  return `${memberValue(fam, c, x1)}`;
}

function sampleMember(rng: Rng, difficulty: number, expAtOne: boolean): MemberParams {
  if (difficulty < 2 || rng.chance(0.4)) {
    const n = difficulty >= 2 ? rng.int(1, 3) : rng.int(1, 2);
    const a = n === 3 ? rng.pick([1, -1]) : rng.pick(difficulty >= 2 ? [1, 2, 3, -1, -2] : [1, 2, 3, -1]);
    const x1 = n === 3 ? rng.pick([1, 2, -1]) : rng.pick([1, 2, 3, -1, -2]);
    let c = 0;
    while (c === 0) c = rng.int(-8, 8);
    return { fam: { kind: 'add', a, n }, c, x1 };
  }
  const kind = rng.pick<FamKind>(['exp', 'pow', 'inv']);
  if (kind === 'pow') {
    const n = rng.pick([2, 2, 3]);
    return { fam: { kind, a: 1, n }, c: rng.int(2, 6), x1: n === 3 ? 2 : rng.int(2, 3) };
  }
  if (kind === 'inv') {
    const x1 = rng.int(2, 5);
    return { fam: { kind, a: 1, n: -1 }, c: x1 * rng.int(1, 6), x1 };
  }
  return { fam: { kind, a: rng.pick([1, 2, 3, -1, -2]), n: 0 }, c: rng.int(2, 9), x1: expAtOne && rng.chance(0.6) ? 1 : 0 };
}

interface MemberLines {
  substituted: string;
  constant: string;
  particular: string;
  slips: [string[], string[], string[]];
}

export function memberLines(params: MemberParams): MemberLines {
  const { fam, c, x1 } = params;
  const y1 = memberValue(fam, c, x1);
  const yTex = memberYTex(params);
  const particular = memberTex(fam, c);
  switch (fam.kind) {
    case 'add': {
      const fx = fam.a * x1 ** fam.n;
      const slipFx = fam.n === 1 ? fam.a * x1 * x1 : fam.a * x1;
      return {
        substituted: `${y1} = ${fx} + C`,
        constant: `C = ${c}`,
        particular,
        slips: [
          [`${y1} = ${slipFx} + C`, `${fx} = ${y1} + C`, `${y1} = ${fx}C`],
          [`C = ${y1 + fx}`, `C = ${fx - y1}`, `C = ${y1}`],
          [memberTex(fam, -c), memberTex(fam, y1), memberTex(fam, c + 1)],
        ],
      };
    }
    case 'pow': {
      const xn = x1 ** fam.n;
      return {
        substituted: `${y1} = ${xn}A`,
        constant: `A = ${c}`,
        particular,
        slips: [
          [`${y1} = ${x1 * fam.n}A`, `${y1} = ${xn} + A`, `${y1}A = ${xn}`],
          [`A = ${y1 * xn}`, `A = ${y1 - xn}`, `A = ${y1}`],
          [memberTex(fam, y1), `y = x^{${fam.n}} + ${c}`, memberTex(fam, c + 1)],
        ],
      };
    }
    case 'inv':
      return {
        substituted: `${y1} = \\frac{C}{${x1}}`,
        constant: `C = ${c}`,
        particular,
        slips: [
          [`${y1} = ${x1}C`, `${x1} = \\frac{C}{${y1}}`, `${y1} = \\frac{${x1}}{C}`],
          [`C = ${y1 + x1}`, `C = ${y1}`, `C = ${c + x1}`],
          [memberTex(fam, y1), `y = \\frac{1}{x} + ${c}`, memberTex(fam, c + x1)],
        ],
      };
    case 'exp': {
      const e = x1 === 0 ? 'e^{0}' : `e^{${fam.a}}`;
      return {
        substituted: `${yTex} = A${e}`,
        constant: `A = ${c}`,
        particular,
        slips: [
          [`${yTex} = A + ${e}`, `0 = Ae^{${c}}`, `${yTex} = A${x1 === 0 ? `e^{${fam.a}}` : 'e^{0}'}`],
          [`A = ${c + 1}`, `A = ${c * Math.abs(fam.a) + 1}`, 'A = 1'],
          [`y = ${expPart(fam.a)} + ${c}`, memberTex(fam, c + 1), `y = ${c}${expPart(-fam.a)}`],
        ],
      };
    }
  }
}

function memberSolution(params: MemberParams): SolutionStep[] {
  const { fam, x1 } = params;
  const lines = memberLines(params);
  const L = letterOf(fam);
  return [
    { text: `Put $x = ${x1}$ and $y = ${memberYTex(params)}$ into the family.`, tex: lines.substituted },
    { text: `Solve for $${L}$.`, tex: lines.constant },
    { text: `Write the family again with $${L}$ put in.`, tex: lines.particular },
  ];
}

/** Put the point in, find the constant, write the member: one tap at a time. */
const deFamPointSteps: Generator<MemberParams> = {
  id: 'de-fam-point-steps',
  sample: (rng, difficulty) => sampleMember(rng, difficulty, false),
  render: (params): Slide => {
    const lines = memberLines(params);
    const L = letterOf(params.fam);
    return {
      kind: 'steps',
      prompt: [
        prose(`Find the member through the point. Tap the comma to put the point in, then the line to find $${L}$, then again to write the member.`),
      ],
      start: [familyTex(params.fam), ',', pointTex(params.x1, memberYTex(params))],
      reductions: [
        { span: [0, 3], operator: 1, value: lines.substituted, bank: stepBank(lines.substituted, ...lines.slips[0]) },
        { span: [0, 1], operator: 0, value: lines.constant, bank: stepBank(lines.constant, ...lines.slips[1]) },
        { span: [0, 1], operator: 0, value: lines.particular, bank: stepBank(lines.particular, ...lines.slips[2]) },
      ],
    };
  },
  solution: memberSolution,
};

/** The constant for the member through a point, typed. */
const deFamMember: Generator<MemberParams> = {
  id: 'de-fam-member',
  sample: (rng, difficulty) => sampleMember(rng, difficulty, true),
  choices: (params) => {
    const { fam, c, x1 } = params;
    const y1 = memberValue(fam, c, x1);
    const slips =
      fam.kind === 'add'
        ? [y1 + fam.a * x1 ** fam.n, fam.a * x1 ** fam.n - y1, y1]
        : fam.kind === 'pow'
          ? [y1 * x1 ** fam.n, y1 - x1 ** fam.n, y1]
          : fam.kind === 'inv'
            ? [y1, y1 + x1, c + x1]
            : [c * Math.abs(fam.a), c + 1, c + Math.abs(fam.a)];
    return numberChoices(c, slips, mix(famIndex(fam), fam.a, c, x1));
  },
  render: (params): Slide => {
    const L = letterOf(params.fam);
    return {
      kind: 'expression',
      prompt: [
        prose(`Find $${L}$ for the member of this family through $${pointTex(params.x1, memberYTex(params))}$.`),
        display(familyTex(params.fam)),
      ],
      lead: `${L} =`,
      keypad: [],
      answer: `${params.c}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: memberSolution,
};

/* ---------- Lesson 2: sliding to the member through a point ---------- */

export interface ThroughParams {
  a: number;
  n: number;
  c: number;
  x1: number;
}

export const throughFamily = ({ a, n }: ThroughParams): Family => ({ kind: 'add', a, n });

const deFamThrough: Generator<ThroughParams> = {
  id: 'de-fam-through',
  sample: (rng, difficulty) => {
    for (;;) {
      const n = difficulty >= 2 ? rng.int(1, 3) : rng.int(1, 2);
      const a = n === 3 ? rng.pick([1, -1]) : rng.pick(difficulty >= 2 ? [1, 2, 3, -1, -2] : [1, 2, -1]);
      const x1 = difficulty >= 2 ? rng.pick([1, 2, 3, -1, -2]) : rng.int(1, 3);
      const c = rng.int(-8, 8);
      const y1 = a * x1 ** n + c;
      if (c === 0 || Math.abs(y1) > 9 || y1 === c) continue;
      return { a, n, c, x1 };
    }
  },
  render: (params): Slide => {
    const { c, x1 } = params;
    const fam = throughFamily(params);
    const y1 = memberValue(fam, c, x1);
    const others = [c + 5, c - 5, c + 9].filter((other) => Math.abs(other) <= 10).slice(0, 2);
    return {
      kind: 'slider',
      prompt: [
        prose(`The dashed curves are members of $${familyTex(fam)}$. Slide to the $C$ of the member through the marked point $${pointTex(x1, y1)}$.`),
        prose('The line shows where that member crosses the $y$-axis.'),
      ],
      min: -10,
      max: 10,
      step: 1,
      answer: c,
      readout: 'C = {v}',
      figure: plotFigure(
        plotSvg({
          xMin: x1 < 0 ? -2.5 : -1,
          xMax: x1 < 0 ? 1 : 3.5,
          yMin: -11,
          yMax: 11,
          curves: others.map((other) => ({ f: (x: number) => memberValue(fam, other, x), dashed: true })),
          verticals: [{ x: 0, dashed: false }],
          marks: [{ x: x1, y: y1 }],
          label: `Two dashed members of a family and a marked point at x = ${x1}, height ${y1}`,
        }),
        'y',
      ),
    };
  },
  solution: (params) => memberSolution({ fam: throughFamily(params), c: params.c, x1: params.x1 }),
};

/* ---------- Lesson 2: another point on the same member ---------- */

export interface OnPointParams {
  fam: Family;
  c: number;
  x1: number;
  x2: number;
}

/** The y offered at x2: the right one first, then the slips. */
export function onPointYs({ fam, c, x1, x2 }: OnPointParams): number[] {
  const y1 = memberValue(fam, c, x1);
  const y2 = memberValue(fam, c, x2);
  const wrong =
    fam.kind === 'add'
      ? [fam.a * x2 ** fam.n - c, fam.a * x2 ** fam.n, y1 + fam.a * x2 ** fam.n]
      : fam.kind === 'pow'
        ? [y1 * x2 ** fam.n, c * x2, y2 + c]
        : [y1 * x2, y1 + x2 - x1, y2 + 1];
  const out = [y2];
  for (const value of [...wrong, y2 + 2, y2 - 2, y2 + 3]) {
    if (out.length === 4) break;
    if (Number.isInteger(value) && !out.includes(value)) out.push(value);
  }
  return out;
}

const deFamOnPoint: Generator<OnPointParams> = {
  id: 'de-fam-onpoint',
  sample: (rng, difficulty) => {
    const kind = difficulty >= 2 ? rng.pick<FamKind>(['add', 'pow', 'inv']) : 'add';
    if (kind === 'pow') {
      const [x1, x2] = rng.sample([1, 2, 3, -1, -2], 2);
      return { fam: { kind, a: 1, n: 2 }, c: rng.int(2, 5), x1, x2 };
    }
    if (kind === 'inv') {
      const [x1, x2] = rng.sample([1, 2, 3, 4, 6], 2);
      const c = x1 * x2 * rng.int(1, 2);
      return { fam: { kind, a: 1, n: -1 }, c: c > 30 ? x1 * x2 : c, x1, x2 };
    }
    const n = rng.int(1, 2);
    const [x1, x2] = rng.sample(n === 2 ? [1, 2, 3, -1, -2] : [1, 2, 3, 4, -1, -2], 2);
    let c = 0;
    while (c === 0) c = rng.int(-6, 6);
    return { fam: { kind: 'add', a: rng.pick([1, 2, -1, 3]), n }, c, x1, x2 };
  },
  render: (params): Slide => {
    const { fam, c, x1, x2 } = params;
    const [right, ...wrong] = onPointYs(params);
    return choiceSlide(
      [
        prose(`One member of this family passes through $${pointTex(x1, memberValue(fam, c, x1))}$.`),
        display(familyTex(fam)),
        prose('Which other point is on that member?'),
      ],
      [{ label: pointTex(x2, right), tex: true, correct: true }, ...wrong.map((y) => ({ label: pointTex(x2, y), tex: true }))],
      mix(famIndex(fam), fam.a, c, x1, x2),
    );
  },
  solution: (params) => {
    const { fam, c, x2 } = params;
    return [
      ...memberSolution(params),
      { text: `Then put in $x = ${x2}$.`, tex: `y = ${memberValue(fam, c, x2)}` },
      { text: `So the point is $${pointTex(x2, memberValue(fam, c, x2))}$.` },
    ];
  },
};

/* ============================================================
 * The gradient dy/dx = f(x, y)
 * ============================================================ */

/**
 * A right-hand side in x and y.
 *
 * - `lin`: p x + q y + r
 * - `prod`: p x y
 * - `quad`: p x^2 + q y
 * - `ratio`: p y / x
 */
export type RhsForm = 'lin' | 'prod' | 'quad' | 'ratio';

export interface Rhs {
  form: RhsForm;
  p: number;
  q: number;
  r: number;
}

export function rhsValue({ form, p, q, r }: Rhs, x: number, y: number): number {
  switch (form) {
    case 'lin':
      return p * x + q * y + r;
    case 'prod':
      return p * x * y;
    case 'quad':
      return p * x * x + q * y;
    case 'ratio':
      return (p * y) / x;
  }
}

export function rhsTex({ form, p, q, r }: Rhs): string {
  switch (form) {
    case 'lin':
      return sumTex([termTex(p, 1), coefOn(q, 'y'), `${r}`]);
    case 'prod':
      return coefOn(p, 'xy');
    case 'quad':
      return sumTex([termTex(p, 2), coefOn(q, 'y')]);
    case 'ratio':
      return p < 0 ? `-\\frac{${coefOn(-p, 'y')}}{x}` : `\\frac{${coefOn(p, 'y')}}{x}`;
  }
}

export function rhsAnswer({ form, p, q, r }: Rhs): string {
  switch (form) {
    case 'lin':
      return `(${p})*x + (${q})*y + (${r})`;
    case 'prod':
      return `(${p})*x*y`;
    case 'quad':
      return `(${p})*x^2 + (${q})*y`;
    case 'ratio':
      return `(${p})*y/x`;
  }
}

/** A coefficient times a number, as a term of a substitution. */
function timesTex(c: number, v: string): string {
  if (c === 1) return v;
  if (c === -1) return `-${v}`;
  return `${c} \\times ${v}`;
}

/** The right-hand side with the point put in, before it is worked out. */
export function substitutedTex({ form, p, q, r }: Rhs, x: number, y: number): string {
  switch (form) {
    case 'lin':
      return sumTex([timesTex(p, num(x)), timesTex(q, num(y)), `${r}`]);
    case 'prod':
      return timesTex(p, `${num(x)} \\times ${num(y)}`);
    case 'quad':
      return sumTex([timesTex(p, `${num(x)}^{2}`), timesTex(q, num(y))]);
    case 'ratio':
      return `\\frac{${timesTex(p, num(y))}}{${x}}`;
  }
}

/** The display line for the equation. */
export const rhsDeTex = (rhs: Rhs): string => `${DYDX} = ${rhsTex(rhs)}`;

function sampleRhs(rng: Rng, difficulty: number): Rhs {
  const form = rng.pick<RhsForm>(difficulty >= 2 ? ['lin', 'lin', 'prod', 'quad', 'ratio'] : ['lin', 'lin', 'prod']);
  const small = [1, 2, -1, -2];
  switch (form) {
    case 'lin':
      return { form, p: rng.pick(small), q: rng.pick(small), r: difficulty >= 2 ? rng.int(-3, 3) : 0 };
    case 'prod':
      return { form, p: rng.pick([1, 2, -1]), q: 0, r: 0 };
    case 'quad':
      return { form, p: rng.pick([1, -1]), q: rng.pick(small), r: 0 };
    case 'ratio':
      return { form, p: rng.pick([1, 2, 3, -1, -2]), q: 0, r: 0 };
  }
}

/** A whole point where the right-hand side is defined and whole. */
function samplePoint(rng: Rng, rhs: Rhs): [number, number] {
  for (;;) {
    const x = rng.int(-3, 4);
    const y = rng.int(-3, 4);
    if (rhs.form === 'ratio' && (x === 0 || (rhs.p * y) % x !== 0)) continue;
    return [x, y];
  }
}

function gradientSolution(rhs: Rhs, x: number, y: number): SolutionStep[] {
  const m = rhsValue(rhs, x, y);
  return [
    { text: `Put $x = ${x}$ and $y = ${y}$ into the right-hand side.`, tex: `${DYDX} = ${substitutedTex(rhs, x, y)}` },
    { tex: `= ${m}` },
    {
      text:
        m === 0
          ? `So the solution curve through $${pointTex(x, y)}$ is flat there.`
          : `So the solution curve through $${pointTex(x, y)}$ has gradient $${m}$ there: it is ${m > 0 ? 'rising' : 'falling'}.`,
    },
  ];
}

export interface PointRhsParams {
  rhs: Rhs;
  x: number;
  y: number;
}

/* ---------- Lesson 3: the gradient at a point ---------- */

const deFamGradient: Generator<PointRhsParams> = {
  id: 'de-fam-gradient',
  sample: (rng, difficulty) => {
    const rhs = sampleRhs(rng, difficulty);
    const [x, y] = samplePoint(rng, rhs);
    return { rhs, x, y };
  },
  choices: ({ rhs, x, y }) => {
    const m = rhsValue(rhs, x, y);
    const swapped = rhs.form === 'ratio' ? (y === 0 ? m + 1 : (rhs.p * x) / y) : rhsValue(rhs, y, x);
    const slip = rhs.form === 'lin' ? rhs.p * x - rhs.q * y + rhs.r : rhs.form === 'quad' ? rhs.p * 2 * x + rhs.q * y : m + 2;
    return numberChoices(m, [swapped, -m, slip], mix(rhs.p, rhs.q, rhs.r, x, y));
  },
  render: ({ rhs, x, y }): Slide => ({
    kind: 'expression',
    prompt: [display(rhsDeTex(rhs)), prose(`Find the gradient $m$ of the solution curve through $${pointTex(x, y)}$.`)],
    lead: 'm =',
    keypad: [],
    answer: `${rhsValue(rhs, x, y)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ rhs, x, y }) => gradientSolution(rhs, x, y),
};

/* ---------- Lessons 3 and 5: following a segment ---------- */

export interface StepParams {
  rhs: Rhs;
  x: number;
  y: number;
  /** One step along the field, or two. */
  steps: 1 | 2;
}

/** [m0, y1] for one step; [m0, y1, m1, y2] for two. With one step, the two terms come first. */
export function stepValues({ rhs, x, y, steps }: StepParams): number[] {
  const m0 = rhsValue(rhs, x, y);
  const y1 = y + m0;
  if (steps === 1) return [rhs.p * x, rhs.q * y + rhs.r, m0, y1];
  const m1 = rhsValue(rhs, x + 1, y1);
  return [m0, y1, m1, y1 + m1];
}

const deFamStepTree: Generator<StepParams> = {
  id: 'de-fam-step-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const small = [1, 2, -1, -2];
      const rhs: Rhs = { form: 'lin', p: rng.pick(small), q: rng.pick(difficulty >= 2 ? [1, -1] : small), r: difficulty >= 2 ? rng.int(-2, 2) : 0 };
      const params: StepParams = { rhs, x: rng.int(-2, 3), y: rng.int(-3, 4), steps: difficulty >= 2 ? 2 : 1 };
      const values = stepValues(params);
      if (values.some((v) => Math.abs(v) > 20)) continue;
      // A two-term sum on a single step needs two terms: a zero one is no question.
      if (params.steps === 1 && (values[0] === 0 || values[1] === 0)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { rhs, x, y, steps } = params;
    const answer = stepValues(params);
    if (steps === 1) {
      const [px, qy, m, y1] = answer;
      return {
        kind: 'tree',
        prompt: [
          prose(
            `Start at $${pointTex(x, y)}$ and follow the segment one unit to the right. Fill in the $x$ term and the $y$ term, the gradient, then the height at $x = ${x + 1}$.`,
          ),
        ],
        expression: rhsDeTex(rhs),
        nodes: [
          { id: 'px', from: [] },
          { id: 'qy', from: [] },
          { id: 'm', from: ['px', 'qy'] },
          { id: 'y1', from: ['m'] },
        ],
        bank: treeBank(answer, [px - qy, y - m, m + x, y1 + 1]),
        answer: answer.map(String),
      };
    }
    const [m0, y1, m1, y2] = answer;
    return {
      kind: 'tree',
      prompt: [
        prose(
          `Start at $${pointTex(x, y)}$ and follow the field one unit right, then one more. Fill in the gradient, the new height, the gradient there, then the height at $x = ${x + 2}$.`,
        ),
      ],
      expression: rhsDeTex(rhs),
      nodes: [
        { id: 'm0', from: [] },
        { id: 'y1', from: ['m0'] },
        { id: 'm1', from: ['y1'] },
        { id: 'y2', from: ['m1'] },
      ],
      bank: treeBank(answer, [y - m0, rhsValue(rhs, x + 1, y), y1 - m1, y2 + 1]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { rhs, x, y, steps } = params;
    const values = stepValues(params);
    const m0 = rhsValue(rhs, x, y);
    const out: SolutionStep[] = [
      { text: `The gradient at $${pointTex(x, y)}$:`, tex: `${DYDX} = ${substitutedTex(rhs, x, y)} = ${m0}` },
      { text: `One unit right, the segment ${m0 >= 0 ? 'rises' : 'falls'} by $${Math.abs(m0)}$.`, tex: `y = ${y} ${m0 < 0 ? '-' : '+'} ${Math.abs(m0)} = ${y + m0}` },
    ];
    if (steps === 2) {
      const [, y1, m1, y2] = values;
      out.push(
        { text: `At $${pointTex(x + 1, y1)}$ the gradient is`, tex: `${substitutedTex(rhs, x + 1, y1)} = ${m1}` },
        { text: 'One more unit right:', tex: `y = ${y1} ${m1 < 0 ? '-' : '+'} ${Math.abs(m1)} = ${y2}` },
      );
    }
    return out;
  },
};

/* ---------- Lessons 3 and 5: rising, falling or flat ---------- */

const RISING = 'Rising';
const FALLING = 'Falling';
const FLAT = 'Flat';

const deFamSign: Generator<PointRhsParams> = {
  id: 'de-fam-sign',
  sample: (rng, difficulty) => {
    const rhs = sampleRhs(rng, difficulty);
    if (rng.chance(0.3)) {
      // A point on the flat line, where there is one through a whole point.
      for (let tries = 0; tries < 40; tries += 1) {
        const [x, y] = samplePoint(rng, rhs);
        if (rhsValue(rhs, x, y) === 0) return { rhs, x, y };
      }
    }
    const [x, y] = samplePoint(rng, rhs);
    return { rhs, x, y };
  },
  render: ({ rhs, x, y }): Slide => {
    const m = rhsValue(rhs, x, y);
    return choiceSlide(
      [display(rhsDeTex(rhs)), prose(`Is the solution curve through $${pointTex(x, y)}$ rising, falling or flat there?`)],
      [
        { label: RISING, correct: m > 0 },
        { label: FALLING, correct: m < 0 },
        { label: FLAT, correct: m === 0 },
      ],
      mix(rhs.p, rhs.q, rhs.r, x, y, ['lin', 'prod', 'quad', 'ratio'].indexOf(rhs.form)),
    );
  },
  solution: ({ rhs, x, y }) => gradientSolution(rhs, x, y),
};

/* ---------- Lesson 3: which point has this gradient ---------- */

/** The right point first, then three where the gradient is something else. */
export function gradPoints({ rhs, x, y }: PointRhsParams): [number, number][] {
  const m = rhsValue(rhs, x, y);
  const candidates: [number, number][] = [
    [y, x],
    [x, y + 1],
    [x + 1, y],
    [-x, y],
    [x, -y],
    [x + 1, y + 1],
    [x - 1, y],
    [x, y - 1],
    [x + 2, y - 1],
    [x - 1, y + 2],
  ];
  const out: [number, number][] = [[x, y]];
  for (const [cx, cy] of turned(candidates, mix(x, y, rhs.p) % 3)) {
    if (out.length === 4) break;
    if (rhs.form === 'ratio' && cx === 0) continue;
    const value = rhsValue(rhs, cx, cy);
    if (!Number.isFinite(value) || value === m) continue;
    if (out.some(([ox, oy]) => ox === cx && oy === cy)) continue;
    out.push([cx, cy]);
  }
  return out;
}

const deFamGradPoint: Generator<PointRhsParams> = {
  id: 'de-fam-gradpoint',
  sample: (rng, difficulty) => {
    const rhs = sampleRhs(rng, difficulty);
    const [x, y] = samplePoint(rng, rhs);
    return { rhs, x, y };
  },
  render: (params): Slide => {
    const { rhs, x, y } = params;
    const [right, ...wrong] = gradPoints(params);
    return choiceSlide(
      [display(rhsDeTex(rhs)), prose(`At which point is the gradient $${rhsValue(rhs, x, y)}$?`)],
      [{ label: pointTex(...right), tex: true, correct: true }, ...wrong.map((point) => ({ label: pointTex(...point), tex: true }))],
      mix(rhs.p, rhs.q, rhs.r, x, y),
    );
  },
  solution: (params) => {
    const { rhs, x, y } = params;
    const [, ...wrong] = gradPoints(params);
    const [wx, wy] = wrong[0];
    return [
      { text: 'Put each point into the right-hand side and keep the one that gives the gradient asked for.' },
      { tex: `${pointTex(x, y)}: \\quad ${substitutedTex(rhs, x, y)} = ${rhsValue(rhs, x, y)}` },
      { text: `The others miss: for example`, tex: `${pointTex(wx, wy)}: \\quad ${substitutedTex(rhs, wx, wy)} = ${rhsValue(rhs, wx, wy)}` },
    ];
  },
};

/* ============================================================
 * Lesson 4: direction fields
 * ============================================================ */

interface Shape {
  tex: string;
  f: (x: number, y: number) => number;
  /** How to recognise the field, for the worked solution. */
  why: string;
}

export const SHAPES: Shape[] = [
  { tex: 'x', f: (x) => x, why: 'The segments are the same all the way up each vertical line, so the gradient depends on $x$ alone. They rise right of the $y$-axis and fall left of it.' },
  { tex: 'y', f: (_x, y) => y, why: 'The segments are the same all along each horizontal line, so the gradient depends on $y$ alone. They rise above the $x$-axis and fall below it.' },
  { tex: '-x', f: (x) => -x, why: 'The segments are the same all the way up each vertical line, so the gradient depends on $x$ alone. They fall right of the $y$-axis and rise left of it.' },
  { tex: '-y', f: (_x, y) => -y, why: 'The segments are the same all along each horizontal line, so the gradient depends on $y$ alone. They fall above the $x$-axis and rise below it.' },
  { tex: 'x + y', f: (x, y) => x + y, why: 'The segments are flat along the line $y = -x$, and rise above it and fall below it.' },
  { tex: 'x - y', f: (x, y) => x - y, why: 'The segments are flat along the line $y = x$, and rise below it and fall above it.' },
  { tex: 'y - x', f: (x, y) => y - x, why: 'The segments are flat along the line $y = x$, and rise above it and fall below it.' },
  { tex: 'xy', f: (x, y) => x * y, why: 'The segments are flat along both axes, rising in the top right and bottom left and falling in the other two quarters.' },
  { tex: '-xy', f: (x, y) => -x * y, why: 'The segments are flat along both axes, falling in the top right and bottom left and rising in the other two quarters.' },
  { tex: 'x^{2}', f: (x) => x * x, why: 'The segments are the same up each vertical line and never fall: flat on the $y$-axis, steeper further from it on both sides.' },
  { tex: 'y^{2}', f: (_x, y) => y * y, why: 'The segments are the same along each horizontal line and never fall: flat on the $x$-axis, steeper further from it above and below.' },
];

/** d1 draws from the first six shapes. */
const EASY_SHAPES = 6;

export interface FieldParams {
  shape: number;
  /** Which three of the other shapes are offered. */
  pick: number;
  difficulty: number;
}

export function fieldOptions({ shape, pick, difficulty }: FieldParams): number[] {
  const pool = difficulty >= 2 ? SHAPES.length : EASY_SHAPES;
  const others = Array.from({ length: pool }, (_, i) => i).filter((i) => i !== shape);
  return [shape, ...turned(others, pick).slice(0, 3)];
}

const deFamField: Generator<FieldParams> = {
  id: 'de-fam-field',
  sample: (rng, difficulty) => {
    const pool = difficulty >= 2 ? SHAPES.length : EASY_SHAPES;
    return { shape: rng.int(0, pool - 1), pick: rng.int(0, pool - 2), difficulty: difficulty >= 2 ? 2 : 1 };
  },
  render: (params): Slide => {
    const [right, ...wrong] = fieldOptions(params);
    const svg = fieldSvg({
      xMin: -3,
      xMax: 3,
      yMin: -2,
      yMax: 2,
      f: SHAPES[right].f,
      label: 'A direction field: short segments on a grid of whole points',
    });
    return choiceSlide(
      [{ kind: 'diagram', svg }, prose('Which differential equation has this direction field?')],
      [
        { label: `${DYDX} = ${SHAPES[right].tex}`, tex: true, correct: true },
        ...wrong.map((i) => ({ label: `${DYDX} = ${SHAPES[i].tex}`, tex: true })),
      ],
      mix(params.shape, params.pick, params.difficulty),
    );
  },
  solution: ({ shape }) => [
    { text: SHAPES[shape].why },
    { text: 'That is the field of', tex: `${DYDX} = ${SHAPES[shape].tex}` },
  ],
};

/* ---------- Lesson 4: isoclines ---------- */

/**
 * dy/dx = p x^k + s y, with k = 1 or 2, or p x y. The isocline where the
 * gradient is m: y = s(m - p x^k), or y = m / (p x).
 */
export interface IsoclineParams {
  form: 'lin' | 'quad' | 'prod';
  p: number;
  s: number;
  m: number;
}

export const isoRhs = ({ form, p, s }: IsoclineParams): Rhs =>
  form === 'prod' ? { form, p, q: 0, r: 0 } : form === 'lin' ? { form, p, q: s, r: 0 } : { form: 'quad', p, q: s, r: 0 };

/** The isocline as the learner reads it, after `y =`. */
export function isoclineTex({ form, p, s, m }: IsoclineParams): string {
  if (form === 'prod') {
    const k = m / p;
    return k < 0 ? `-\\frac{${-k}}{x}` : `\\frac{${k}}{x}`;
  }
  const power = form === 'lin' ? 1 : 2;
  return s > 0 ? sumTex([termTex(-p, power), `${m}`]) : sumTex([termTex(p, power), `${-m}`]);
}

export function isoclineAnswer({ form, p, s, m }: IsoclineParams): string {
  if (form === 'prod') return `(${m / p})/x`;
  const power = form === 'lin' ? 1 : 2;
  return `(${s})*((${m}) - (${p})*x^${power})`;
}

const deFamIsocline: Generator<IsoclineParams> = {
  id: 'de-fam-isocline',
  sample: (rng, difficulty) => {
    const form = difficulty >= 2 ? rng.pick<IsoclineParams['form']>(['lin', 'quad', 'prod']) : 'lin';
    if (form === 'prod') {
      const p = rng.pick([1, 2]);
      let k = 0;
      while (k === 0) k = rng.int(-4, 4);
      return { form, p, s: 1, m: p * k };
    }
    return {
      form,
      p: form === 'quad' ? rng.pick([1, -1, 2]) : rng.pick([1, 2, 3, -1, -2, -3]),
      s: rng.pick([1, -1]),
      m: rng.int(-4, 4),
    };
  },
  choices: (params) => {
    const { form, p, s, m } = params;
    const right = { tex: `y = ${isoclineTex(params)}`, answer: isoclineAnswer(params) };
    const alt = (next: IsoclineParams) => ({ tex: `y = ${isoclineTex(next)}`, answer: isoclineAnswer(next) });
    if (form === 'prod') {
      const k = m / p;
      return options(
        right,
        { tex: `y = ${coefOn(k, 'x')}`, answer: `(${k})*x` },
        { tex: `y = ${sumTex([`${m}`, '-x'])}`, answer: `(${m}) - x` },
        alt({ ...params, m: -m }),
      );
    }
    const candidates = [{ ...params, s: -s }, { ...params, m: -m }, { ...params, p: -p }, { ...params, m: m + (m >= 0 ? 1 : -1) }];
    // Drop any that is the same line as the right one, or as another, written another way.
    const same = (u: IsoclineParams, v: IsoclineParams) => [1.5, -0.7, 2.3].every((x) => Math.abs(isoclineAt(u, x) - isoclineAt(v, x)) < 1e-9);
    const kept: IsoclineParams[] = [];
    for (const candidate of candidates) {
      if (same(candidate, params) || kept.some((other) => same(other, candidate))) continue;
      kept.push(candidate);
    }
    return options(right, ...kept.slice(0, 3).map(alt));
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      display(rhsDeTex(isoRhs(params))),
      prose(params.m === 0 ? 'Where is the gradient zero? Give $y$ in terms of $x$.' : `Where is the gradient $${params.m}$? Give $y$ in terms of $x$.`),
    ],
    lead: 'y =',
    keypad: ALGEBRA_KEYS,
    answer: isoclineAnswer(params),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { form, p, s, m } = params;
    const rhs = isoRhs(params);
    if (form === 'prod') {
      return [
        { text: `Set the gradient equal to $${m}$.`, tex: `${rhsTex(rhs)} = ${m}` },
        { text: `Divide by $${coefOn(p, 'x')}$.`, tex: `y = ${isoclineTex(params)}` },
        { text: 'Along that curve every segment has the same gradient: it is an isocline.' },
      ];
    }
    return [
      { text: `Set the gradient equal to $${m}$.`, tex: `${rhsTex(rhs)} = ${m}` },
      {
        text:
          s > 0
            ? `Move the $x$ term to the other side.`
            : m === 0
              ? 'Add $y$ to both sides.'
              : m < 0
                ? `Add $y$ to both sides, then add $${-m}$ to both.`
                : `Add $y$ to both sides, then take $${m}$ from both.`,
        tex: `y = ${isoclineTex(params)}`,
      },
      { text: m === 0 ? 'Along that line every segment is flat.' : `Along that ${form === 'lin' ? 'line' : 'curve'} every segment has gradient $${m}$: it is an isocline.` },
    ];
  },
};

/** The isocline's height at x, for telling two apart by value. */
export function isoclineAt({ form, p, s, m }: IsoclineParams, x: number): number {
  if (form === 'prod') return m / (p * x);
  return s * (m - p * x ** (form === 'lin' ? 1 : 2));
}

/* ---------- Lesson 4: where the segments are flat ---------- */

export interface FlatParams {
  rhs: Rhs;
  a: number;
}

/** The height on x = a where the gradient is zero. q is always 1 or -1. */
export function flatY({ rhs, a }: FlatParams): number {
  const { form, p, q, r } = rhs;
  return form === 'quad' ? -(p * a * a) / q : -(p * a + r) / q;
}

const deFamFlat: Generator<FlatParams> = {
  id: 'de-fam-flat',
  sample: (rng, difficulty) => {
    for (;;) {
      const quad = difficulty >= 2 && rng.chance(0.4);
      const rhs: Rhs = quad
        ? { form: 'quad', p: rng.pick([1, -1]), q: rng.pick([1, -1]), r: 0 }
        : { form: 'lin', p: rng.pick([1, 2, -1, -2]), q: rng.pick([1, -1]), r: difficulty >= 2 ? rng.int(-2, 2) : 0 };
      const params = { rhs, a: rng.int(-2, 2) };
      if (Math.abs(flatY(params)) > 3) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { rhs, a } = params;
    return {
      kind: 'slider',
      prompt: [display(rhsDeTex(rhs)), prose('Slide to the height on the dashed line where the segments are flat.')],
      min: -3,
      max: 3,
      step: 1,
      answer: flatY(params) + 0,
      readout: 'y = {v}',
      figure: plotFigure(
        fieldSvg({
          xMin: -3,
          xMax: 3,
          yMin: -3,
          yMax: 3,
          f: (x, y) => rhsValue(rhs, x, y),
          verticals: [a],
          height: 220,
          label: `The direction field with a dashed line at x = ${a}`,
        }),
        'y',
      ),
    };
  },
  solution: (params) => {
    const { rhs, a } = params;
    const y = flatY(params) + 0;
    const at = rhs.form === 'quad' ? sumTex([timesTex(rhs.p, `${num(a)}^{2}`), coefOn(rhs.q, 'y')]) : sumTex([timesTex(rhs.p, num(a)), coefOn(rhs.q, 'y'), `${rhs.r}`]);
    return [
      { text: `Flat means a gradient of $0$. Put $x = ${a}$ in and set it to zero.`, tex: `${at} = 0` },
      { tex: `y = ${y}` },
      { text: `So the flat segment on the dashed line is at height $${y}$.` },
    ];
  },
};

/* ============================================================
 * Lesson 5: following the field
 * ============================================================ */

/**
 * dy/dx = k (y - a)(y - b) and friends, all with two equilibria.
 *
 * - `two`: (y - a)(y - b)
 * - `zero`: k y (y - a), one root at 0
 * - `square`: y^2 - n^2, roots ±n (a = -n, b = n)
 * - `xfactor`: x (y - a)(y - b): x = 0 is flat too, but not a horizontal solution
 */
export interface EquilibriumParams {
  form: 'two' | 'zero' | 'square' | 'xfactor';
  a: number;
  b: number;
  k: number;
}

export function equilibriumTex({ form, a, b, k }: EquilibriumParams): string {
  switch (form) {
    case 'two':
      return `${DYDX} = ${yLess(a)}${yLess(b)}`;
    case 'zero':
      return `${DYDX} = ${k === 1 ? '' : k}y${yLess(b)}`;
    case 'square':
      return `${DYDX} = y^{2} - ${b * b}`;
    case 'xfactor':
      return `${DYDX} = x${yLess(a)}${yLess(b)}`;
  }
}

export function equilibriumRhsAnswer({ form, a, b, k }: EquilibriumParams): string {
  switch (form) {
    case 'two':
      return `(y - (${a}))*(y - (${b}))`;
    case 'zero':
      return `(${k})*y*(y - (${b}))`;
    case 'square':
      return `y^2 - ${b * b}`;
    case 'xfactor':
      return `x*(y - (${a}))*(y - (${b}))`;
  }
}

const deFamEquilibrium: Generator<EquilibriumParams> = {
  id: 'de-fam-equilibrium',
  sample: (rng, difficulty) => {
    const form = rng.pick<EquilibriumParams['form']>(difficulty >= 2 ? ['two', 'zero', 'square', 'xfactor'] : ['two', 'two', 'zero']);
    if (form === 'square') {
      const n = rng.int(1, 9);
      return { form, a: -n, b: n, k: 1 };
    }
    if (form === 'zero') {
      let b = 0;
      while (b === 0) b = rng.int(-6, 6);
      return { form, a: 0, b, k: rng.pick([1, 2, 3]) };
    }
    for (;;) {
      const a = rng.int(-6, 6);
      const b = rng.int(-6, 6);
      if (a === b || (form === 'xfactor' && (a === 0 || b === 0))) continue;
      return { form, a: Math.min(a, b), b: Math.max(a, b), k: 1 };
    }
  },
  render: (params): Slide => {
    const { a, b, k } = params;
    const answer = [`${a}`, `${b}`];
    const extras = [-a, -b, 0, a + b, k, b + 1].map(String);
    return {
      kind: 'tiles',
      prompt: [
        display(equilibriumTex(params)),
        prose('Which horizontal lines are solutions? Put the two values of $y$ in, in either order.'),
      ],
      template: 'y = {0} \\qquad y = {1}',
      bank: tokenBank(answer, extras, 3),
      answer,
      unordered: true,
    };
  },
  solution: (params) => {
    const { form, a, b } = params;
    const steps: SolutionStep[] = [
      { text: 'A horizontal line $y = c$ has gradient $0$, so it is a solution when the right-hand side is $0$ for every $x$ at $y = c$.' },
    ];
    if (form === 'square') {
      steps.push({ text: 'Solve', tex: chain(`y^{2} - ${b * b} &= 0`, `y &= ${a} \\text{ or } ${b}`) });
    } else {
      steps.push({ text: 'Set each $y$ factor to zero.', tex: `y = ${a} \\qquad y = ${b}` });
    }
    if (form === 'xfactor') {
      steps.push({ text: 'The factor $x$ is zero only on the line $x = 0$, which is not a horizontal line and not a solution $y(x)$.' });
    }
    steps.push({ text: `So $y = ${a}$ and $y = ${b}$ are the equilibrium solutions.` });
    return steps;
  },
};

/* ---------- Lesson 5: which way a solution goes ---------- */

/** dy/dx = s (y - a)(y - b) with a < b, starting at y0. */
export interface RiseParams {
  a: number;
  b: number;
  s: number;
  y0: number;
}

export const riseRhs = ({ a, b, s }: RiseParams) => (y: number): number => s * (y - a) * (y - b);

export function riseTex({ a, b, s }: RiseParams): string {
  return s > 0 ? `${DYDX} = ${yLess(a)}${yLess(b)}` : `${DYDX} = ${yLess(a)}(${b} - y)`;
}

type Region = 'below' | 'between' | 'above';

export const regionOf = ({ a, b, y0 }: RiseParams): Region => (y0 < a ? 'below' : y0 > b ? 'above' : 'between');

const towards = (up: boolean, level: number): string => `${up ? 'Rises' : 'Falls'} towards $y = ${level}$`;
const unlimited = (up: boolean): string => `${up ? 'Rises' : 'Falls'} without limit`;

/** Where it goes: [the right label, the other direction's label]. */
export function fate(params: RiseParams): [string, string] {
  const { a, b, y0 } = params;
  const up = riseRhs(params)(y0) > 0;
  const above = [a, b].filter((level) => level > y0);
  const below = [a, b].filter((level) => level < y0);
  const right = up ? (above.length ? towards(true, Math.min(...above)) : unlimited(true)) : below.length ? towards(false, Math.max(...below)) : unlimited(false);
  const other = up ? (below.length ? towards(false, Math.max(...below)) : unlimited(false)) : above.length ? towards(true, Math.min(...above)) : unlimited(true);
  return [right, other];
}

const REGION_LABEL = (region: Region, a: number, b: number): string =>
  region === 'below' ? `Below $${a}$` : region === 'above' ? `Above $${b}$` : `Between $${a}$ and $${b}$`;

const deFamRise: Generator<RiseParams> = {
  id: 'de-fam-rise',
  sample: (rng, difficulty) => {
    for (;;) {
      const a = rng.int(-4, 4);
      const b = a + rng.int(2, 5);
      const y0 = rng.int(a - 3, b + 3);
      if (y0 === a || y0 === b) continue;
      return { a, b, s: difficulty >= 2 && rng.chance(0.5) ? -1 : 1, y0 };
    }
  },
  render: (params): Slide => {
    const { a, b, y0 } = params;
    const region = regionOf(params);
    const g = riseRhs(params)(y0);
    const salt = mix(a, b, params.s, y0);
    const [right, other] = fate(params);
    const stays = `Stays at $y = ${y0}$`;
    return {
      kind: 'flow',
      prompt: [prose(`The solution starts at $y = ${y0}$ when $x = 0$. Which way does it go?`)],
      subject: riseTex(params),
      steps: [
        {
          id: 'where',
          ask: `Where is $y = ${y0}$ compared with the equilibria $y = ${a}$ and $y = ${b}$?`,
          branches: turned(
            (['below', 'between', 'above'] as Region[]).map((r) =>
              r === region ? { label: REGION_LABEL(r, a, b), to: 'sign' } : { label: REGION_LABEL(r, a, b), outcome: `$${y0}$ is ${REGION_LABEL(region, a, b).toLowerCase()}.` },
            ),
            salt % 3,
          ),
        },
        {
          id: 'sign',
          ask: `What sign is $${DYDX}$ at $y = ${y0}$?`,
          branches: turned(
            [
              { label: g > 0 ? 'Positive' : 'Negative', to: 'fate' },
              { label: g > 0 ? 'Negative' : 'Positive', outcome: `At $y = ${y0}$ the right-hand side is $${g}$.` },
            ],
            (salt >>> 4) % 2,
          ),
        },
        {
          id: 'fate',
          ask: 'So as $x$ increases, the solution',
          branches: turned(
            [
              { label: right, outcome: g > 0 ? 'A positive gradient carries it up, until it meets a flat line or for ever.' : 'A negative gradient carries it down, until it meets a flat line or for ever.' },
              { label: other, outcome: `A ${g > 0 ? 'positive' : 'negative'} gradient means $y$ ${g > 0 ? 'rises' : 'falls'}.` },
              { label: stays, outcome: `Only a start on an equilibrium stays put, and $${y0}$ is not one.` },
            ],
            (salt >>> 8) % 3,
          ),
        },
      ],
      answer: [REGION_LABEL(region, a, b), g > 0 ? 'Positive' : 'Negative', right],
    };
  },
  solution: (params) => {
    const { a, b, y0 } = params;
    const g = riseRhs(params)(y0);
    const [right] = fate(params);
    return [
      { text: `The right-hand side is zero at $y = ${a}$ and $y = ${b}$: those horizontal lines are equilibrium solutions, and no other solution crosses them.` },
      { text: `At the start, $y = ${y0}$:`, tex: `${DYDX} = ${g}` },
      { text: `${g > 0 ? 'Positive, so it rises' : 'Negative, so it falls'}. It ${right.charAt(0).toLowerCase()}${right.slice(1)}.` },
    ];
  },
};

/* ---------- Lesson 5: the level a solution settles at ---------- */

/** A start that settles: below b for s = 1 (settles at a), above a for s = -1 (settles at b). */
export const settleLevel = ({ a, b, s }: RiseParams): number => (s > 0 ? a : b);

const deFamLevel: Generator<RiseParams> = {
  id: 'de-fam-level',
  sample: (rng, difficulty) => {
    for (;;) {
      const a = rng.int(-3, 2);
      const b = a + rng.int(2, 3);
      const s = difficulty >= 2 && rng.chance(0.5) ? -1 : 1;
      const y0 = rng.int(a - 2, b + 2);
      if (y0 === a || y0 === b) continue;
      if (s > 0 ? y0 > b : y0 < a) continue;
      return { a, b, s, y0 };
    }
  },
  render: (params): Slide => {
    const { a, b, y0 } = params;
    const lo = a - 2;
    const hi = b + 2;
    const g = riseRhs(params);
    return {
      kind: 'slider',
      prompt: [
        display(riseTex(params)),
        prose(`The solution through the marked point $${pointTex(0, y0)}$ follows the field. Slide to the level it settles at as $x$ increases.`),
      ],
      min: lo,
      max: hi,
      step: 1,
      answer: settleLevel(params),
      readout: 'y = {v}',
      figure: plotFigure(
        fieldSvg({
          xMin: 0,
          xMax: 4,
          yMin: lo,
          yMax: hi,
          f: (_x, y) => g(y),
          marks: [{ x: 0, y: y0 }],
          height: 230,
          label: `A direction field with a marked starting point at height ${y0}`,
        }),
        'y',
      ),
    };
  },
  solution: (params) => {
    const { a, b, y0 } = params;
    const g = riseRhs(params)(y0);
    const level = settleLevel(params);
    return [
      { text: `The equilibria are $y = ${a}$ and $y = ${b}$, where the right-hand side is zero.` },
      { text: `At the start the gradient is $${g}$, so the solution ${g > 0 ? 'rises' : 'falls'}.` },
      { text: `It cannot cross an equilibrium, so it closes in on $y = ${level}$ and levels off there.` },
    ];
  },
};

/* ---------- Registration ---------- */

export const deFam = {
  deFamRead,
  deFamEffect,
  deFamEquation,
  deFamGapTree,
  deFamPointSteps,
  deFamMember,
  deFamThrough,
  deFamOnPoint,
  deFamGradient,
  deFamStepTree,
  deFamSign,
  deFamGradPoint,
  deFamField,
  deFamIsocline,
  deFamFlat,
  deFamEquilibrium,
  deFamRise,
  deFamLevel,
};

export const deFamilyGenerators = Object.values(deFam) as Generator<never>[];
