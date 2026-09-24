/**
 * An independent check on the lines-meeting-circles generators.
 *
 * The property tests in `generators.test.ts` prove each generator agrees with
 * itself, and the oracle there skips every one of these. So these read what
 * the learner is actually shown — the circle's equation, the line's, the
 * points named in the prompt, and what the slide says is right — parse the
 * TeX with mathjs, and settle the geometry from scratch: a claimed meeting
 * point has to satisfy both displayed equations, a claimed tangent has to
 * leave a zero discriminant, a claimed midpoint has to be halfway between
 * where the line really crosses the circle. A slip in the arithmetic, or in
 * how an equation is written out, fails here even when every generator is
 * internally consistent.
 */
import { describe, expect, it } from 'vitest';
import { math } from '../../engine/expression';
import { makeRng } from '../../engine/rng';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';

const SEEDS = 120;
const XS = [-3, -1, 0, 2, 5];

function slides(id: string): { slide: Slide; where: string }[] {
  const generator = registry[id] as unknown as Generator<unknown>;
  expect(generator, `no generator ${id}`).toBeDefined();
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => ({
      slide: generator.render(generator.sample(makeRng(seed), difficulty)),
      where: `${id} seed ${seed} d${difficulty}`,
    })),
  );
}

/** Every piece of maths in the prompt: display blocks and the $...$ inside prose. */
function texts(slide: Slide): string[] {
  if (!('prompt' in slide)) return [];
  const out: string[] = [];
  for (const block of slide.prompt) {
    if (block.kind === 'display') out.push(block.tex);
    if (block.kind === 'prose') out.push(...[...block.text.matchAll(/\$([^$]+)\$/g)].map((match) => match[1]));
  }
  if (slide.kind === 'flow') out.push(...slide.subject.replace(/\\begin\{gathered\}|\\end\{gathered\}/g, '').split('\\\\'));
  return out.map((tex) => tex.trim());
}

function prose(slide: Slide): string {
  return 'prompt' in slide ? slide.prompt.map((block) => ('text' in block ? block.text : '')).join(' ') : '';
}

/** TeX as mathjs reads it: fractions unwrapped, every implicit product written out. */
function toMath(tex: string): string {
  return tex
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))')
    .replace(/\\times/g, '*')
    .replace(/(\d)\s*([a-z(])/g, '$1*$2')
    .replace(/\)\s*([a-z(\d])/g, ')*$1');
}

/** An equation's left side less its right, as a function of x and y. */
function equation(tex: string): (x: number, y: number) => number {
  const [lhs, rhs] = tex.split('=');
  const compiled = math.compile(`(${toMath(lhs)}) - (${toMath(rhs)})`);
  return (x, y) => compiled.evaluate({ x, y }) as number;
}

interface Circle {
  a: number;
  b: number;
  r2: number;
}

/** A circle's centre and r^2 read off its equation, in either form, by evaluating it. */
function circleOf(tex: string): Circle {
  const f = equation(tex);
  const lead = (f(1, 0) + f(-1, 0)) / 2 - f(0, 0);
  const d = (f(1, 0) - f(-1, 0)) / 2 / lead;
  const e = (f(0, 1) - f(0, -1)) / 2 / lead;
  const a = -d / 2;
  const b = -e / 2;
  return { a, b, r2: a * a + b * b - f(0, 0) / lead };
}

const isCircle = (tex: string) => /x\^2|\(x [+-] \d+\)\^2/.test(tex) && /y\^2|\(y [+-] \d+\)\^2/.test(tex) && tex.includes('=');
const isLine = (tex: string) => /^y = /.test(tex) && !tex.includes('^') && !/\bc\b/.test(tex);

function circleIn(slide: Slide): Circle {
  const tex = texts(slide).find(isCircle);
  if (!tex) throw new Error(`no circle in ${JSON.stringify(texts(slide))}`);
  return circleOf(tex);
}

/** y = mx + c as its gradient and intercept, read by evaluating it. */
function lineOf(tex: string): { m: number; c: number } {
  const f = equation(tex);
  // f(x, y) = y - (mx + c), so f(x, 0) = -(mx + c).
  const c = -f(0, 0);
  return { m: -f(1, 0) - c, c };
}

function lineIn(slide: Slide): { m: number; c: number } {
  const tex = texts(slide).find(isLine);
  if (!tex) throw new Error(`no line in ${JSON.stringify(texts(slide))}`);
  return lineOf(tex);
}

/** A named point in the prompt, such as P(3, -4). */
function pointIn(slide: Slide, name: string): [number, number] {
  const match = new RegExp(`${name}\\((-?\\d+), (-?\\d+)\\)`).exec(prose(slide));
  if (!match) throw new Error(`no point ${name} in ${prose(slide)}`);
  return [Number(match[1]), Number(match[2])];
}

/** The line put into the circle: Ax^2 + Bx + C, recovered from three values. */
function meeting({ a, b, r2 }: Circle, { m, c }: { m: number; c: number }): { A: number; B: number; C: number; D: number } {
  const h = (x: number) => (x - a) ** 2 + (m * x + c - b) ** 2 - r2;
  const C = h(0);
  const B = (h(1) - h(-1)) / 2;
  const A = (h(1) + h(-1)) / 2 - C;
  return { A, B, C, D: B * B - 4 * A * C };
}

/** Where the line really crosses the circle, the smaller x first. */
function crossings(circle: Circle, line: { m: number; c: number }): [number, number][] {
  const { A, B, D } = meeting(circle, line);
  expect(D, 'the line does not cross the circle').toBeGreaterThan(0);
  return [-1, 1].map((sign) => {
    const x = (-B + sign * Math.sqrt(D)) / (2 * A);
    return [x, line.m * x + line.c];
  });
}

const onCircle = ({ a, b, r2 }: Circle, x: number, y: number) => (x - a) ** 2 + (y - b) ** 2 - r2;

/** The template with its blanks filled by the answer tokens. */
const filled = (slide: Extract<Slide, { kind: 'tiles' }>) =>
  slide.template.replace(/\{(\d)\}/g, (_, idx: string) => slide.answer[Number(idx)]).replace(/\\ \\text\{or\}\\ /g, ' ; ');

/** The line after every reduction of a steps slide, the start included. */
function stepLines(slide: Extract<Slide, { kind: 'steps' }>): string[] {
  let line = slide.start;
  const out = [line.join(' ')];
  for (const step of slide.reductions) {
    line = [...line.slice(0, step.span[0]), step.value, ...line.slice(step.span[1])];
    out.push(line.join(' '));
  }
  return out;
}

/** Two quadratics in x with the same roots: one is a fixed multiple of the other. */
function expectProportional(f: (x: number) => number, g: (x: number) => number, where: string) {
  const lead = (h: (x: number) => number) => (h(1) + h(-1)) / 2 - h(0);
  const ratio = lead(f) / lead(g);
  for (const x of XS) expect(f(x), `${where} at x = ${x}`).toBeCloseTo(ratio * g(x), 6);
}

describe('where a line meets a circle, checked from what the learner sees', () => {
  it('substituting: every line of working has the meeting points as its roots', () => {
    for (const { slide, where } of slides('coord-substitute-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const circle = circleIn(slide);
      const line = lineIn(slide);
      const { A, B, C } = meeting(circle, line);
      const h = (x: number) => A * x * x + B * x + C;
      const lines = stepLines(slide);
      lines.forEach((tex, idx) => {
        const f = equation(tex);
        const inX = (x: number) => f(x, 0);
        if (idx < lines.length - 1) {
          // Before dividing, the equation is the substitution itself.
          for (const x of XS) expect(inX(x), `${where} line ${idx} at x = ${x}`).toBeCloseTo(h(x), 6);
        } else {
          expectProportional(inX, h, `${where} last line`);
          expect((inX(1) + inX(-1)) / 2 - inX(0), `${where}: divided through`).toBeCloseTo(1, 9);
        }
      });
    }
  });

  it('the quadratic tiles have the meeting points as roots, x^2 alone at the front', () => {
    for (const { slide, where } of slides('coord-meet-quadratic-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const { A, B, C } = meeting(circleIn(slide), lineIn(slide));
      const f = equation(filled(slide));
      for (const x of XS) expect(f(x, 0), `${where} at x = ${x}`).toBeCloseTo((A * x * x + B * x + C) / A, 6);
    }
  });

  it('the points built from the roots are on the line and on the circle', () => {
    for (const { slide, where } of slides('coord-root-point-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const circle = circleIn(slide);
      const line = lineIn(slide);
      const [x1, x2, y1, y2] = slide.answer.map(Number);
      expect(x1, where).toBeLessThan(x2);
      for (const [x, y] of [
        [x1, y1],
        [x2, y2],
      ]) {
        expect(y, `${where}: (${x}, ${y}) on the line`).toBeCloseTo(line.m * x + line.c, 9);
        expect(onCircle(circle, x, y), `${where}: (${x}, ${y}) on the circle`).toBeCloseTo(0, 9);
        expect(equation(slide.expression)(x, 0), `${where}: ${x} a root of the quadratic shown`).toBeCloseTo(0, 9);
      }
    }
  });

  it('the x asked for is a real meeting point, and the other one when a point is given', () => {
    for (const { slide, where } of slides('coord-meet-circle-x')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const circle = circleIn(slide);
      const line = lineIn(slide);
      const xs = crossings(circle, line).map(([x]) => x);
      const x = Number(slide.answer);
      const text = prose(slide);
      if (text.includes('larger')) expect(x, where).toBeCloseTo(xs[1], 9);
      else if (text.includes('smaller')) expect(x, where).toBeCloseTo(xs[0], 9);
      else {
        const [ax, ay] = pointIn(slide, 'A');
        expect(onCircle(circle, ax, ay), `${where}: A on the circle`).toBeCloseTo(0, 9);
        expect(ay, `${where}: A on the line`).toBeCloseTo(line.m * ax + line.c, 9);
        expect(x, `${where}: B is not A`).not.toBe(ax);
        expect(xs.some((root) => Math.abs(root - x) < 1e-9), `${where}: ${x} is a meeting point`).toBe(true);
      }
    }
  });
});

describe('cuts, touches or misses, checked from what the learner sees', () => {
  const SIGN = (D: number) => (Math.abs(D) < 1e-9 ? 'Zero' : D > 0 ? 'Positive' : 'Negative');

  it('the flow picks the real quadratic and the sign of its discriminant', () => {
    for (const { slide, where } of slides('coord-meet-count-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const { A, B, C, D } = meeting(circleIn(slide), lineIn(slide));
      const picked = equation(slide.answer[0].slice(1, -1));
      for (const x of XS) expect(picked(x, 0), `${where} at x = ${x}`).toBeCloseTo(A * x * x + B * x + C, 6);
      expect(slide.answer[1], where).toBe(SIGN(D));
    }
  });

  it('the discriminant typed is the one the substitution gives', () => {
    for (const { slide, where } of slides('coord-meet-discriminant')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const { A, D } = meeting(circleIn(slide), lineIn(slide));
      // The un-divided quadratic, as the prompt pins it: the one leading with 1 + m^2.
      expect(A, where).toBe(Math.round(A));
      expect(Number(slide.answer), where).toBeCloseTo(D, 6);
    }
  });

  it('exactly one option touches, or misses, the circle', () => {
    for (const { slide, where } of slides('coord-which-line')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const circle = circleIn(slide);
      const touches = prose(slide).includes('touches');
      for (const option of slide.options) {
        const { D } = meeting(circle, lineOf(option.label));
        const right = touches ? Math.abs(D) < 1e-9 : D < -1e-9;
        expect(right, `${where}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });

  it('the slider lands on the point where the drawn line touches', () => {
    for (const { slide, where } of slides('coord-touch-point-slider')) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const line = lineIn(slide);
      const { A, B, D } = meeting(circleIn(slide), line);
      expect(D, `${where}: a tangent`).toBeCloseTo(0, 6);
      const x = -B / (2 * A);
      const target = slide.readout.startsWith('x') ? x : line.m * x + line.c;
      expect(slide.answer, where).toBeCloseTo(target, 9);
    }
  });
});

describe('the tangent condition, checked from what the learner sees', () => {
  /** "y = 2x + c" with c filled in. */
  const withC = (slide: Slide, c: number) => {
    const tex = texts(slide).find((t) => /^y = .* \+ c$/.test(t));
    if (!tex) throw new Error('no y = mx + c in the prompt');
    return lineOf(tex.replace(/\+ c$/, `+ (${c})`));
  };

  it('the c typed makes a tangent, and the one asked for', () => {
    for (const { slide, where } of slides('coord-touch-c')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const circle = circleIn(slide);
      const c = Number(slide.answer);
      const line = withC(slide, c);
      expect(meeting(circle, line).D, where).toBeCloseTo(0, 6);
      // The other tangent with this gradient is the reflection through the centre.
      const other = 2 * (circle.b - line.m * circle.a) - c;
      const text = prose(slide);
      if (text.includes('positive')) expect(c, where).toBeGreaterThan(0);
      if (text.includes('negative')) expect(c, where).toBeLessThan(0);
      if (text.includes('larger')) expect(c, where).toBeGreaterThan(other);
      if (text.includes('smaller')) expect(c, where).toBeLessThan(other);
    }
  });

  it('both lines placed are tangents with the gradient asked', () => {
    for (const { slide, where } of slides('coord-touch-lines-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const circle = circleIn(slide);
      const lines = filled(slide).split(' ; ').map(lineOf);
      expect(lines.length, where).toBe(2);
      expect(lines[0].c, `${where}: two different lines`).not.toBeCloseTo(lines[1].c, 9);
      for (const line of lines) expect(meeting(circle, line).D, where).toBeCloseTo(0, 6);
    }
  });

  it('solving the condition gives two values of c that each make a tangent', () => {
    for (const { slide, where } of slides('coord-touch-condition-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const circle = circleIn(slide);
      const last = slide.reductions[slide.reductions.length - 1].value;
      const match = /^c = (-?\d+ )?\\pm (\d+)$/.exec(last);
      if (!match) throw new Error(`${where}: unreadable ${last}`);
      const centre = match[1] ? Number(match[1]) : 0;
      for (const c of [centre - Number(match[2]), centre + Number(match[2])]) {
        expect(meeting(circle, withC(slide, c)).D, `${where}: c = ${c}`).toBeCloseTo(0, 6);
      }
      // And every line of working holds at the true values of c.
      for (const tex of stepLines(slide).slice(0, -1)) {
        const f = math.compile(toMath(tex.replace('=', '-(') + ')'));
        for (const c of [centre - Number(match[2]), centre + Number(match[2])]) {
          expect(f.evaluate({ c }) as number, `${where}: ${tex} at c = ${c}`).toBeCloseTo(0, 6);
        }
      }
    }
  });

  it('the radius worked back from a tangent makes the line touch', () => {
    for (const { slide, where } of slides('coord-touch-radius-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const line = lineIn(slide);
      const [a, b] = prose(slide).includes('origin') ? [0, 0] : pointIn(slide, 'C');
      const r2 = Number(slide.answer[slide.answer.length - 1]);
      expect(meeting({ a, b, r2 }, line).D, where).toBeCloseTo(0, 6);
    }
  });
});

describe('tangents from a point outside, checked from what the learner sees', () => {
  it('the tangent length is the square root of CP^2 - r^2', () => {
    for (const id of ['coord-tangent-length', 'coord-tangent-length-tree']) {
      for (const { slide, where } of slides(id)) {
        const circle = circleIn(slide);
        const [px, py] = pointIn(slide, 'P');
        const answer = slide.kind === 'tree' ? slide.answer[slide.answer.length - 1] : slide.kind === 'expression' ? slide.answer : '';
        const cp2 = (px - circle.a) ** 2 + (py - circle.b) ** 2;
        expect(cp2, `${where}: P outside`).toBeGreaterThan(circle.r2);
        expect(Number(answer), where).toBeCloseTo(Math.sqrt(cp2 - circle.r2), 9);
      }
    }
  });

  it('the count is none from inside, one from on the circle, two from outside', () => {
    for (const { slide, where } of slides('coord-outside-count')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const circle = circleIn(slide);
      const [px, py] = pointIn(slide, 'P');
      const d = onCircle(circle, px, py);
      const expected = Math.abs(d) < 1e-9 ? 'One' : d < 0 ? 'None' : 'Two';
      expect(slide.options.find((o) => o.id === slide.correctId)?.label, where).toBe(expected);
    }
  });

  it('both gradients solved for give tangents through P', () => {
    for (const { slide, where } of slides('coord-outside-gradient-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const circle = circleIn(slide);
      const [px, py] = pointIn(slide, 'P');
      const last = slide.reductions[slide.reductions.length - 1].value;
      const match = /^m = (-?\d+) \\text\{ or \} m = (-?\d+)$/.exec(last);
      if (!match) throw new Error(`${where}: unreadable ${last}`);
      for (const m of [Number(match[1]), Number(match[2])]) {
        expect(meeting(circle, { m, c: py - m * px }).D, `${where}: m = ${m}`).toBeCloseTo(0, 6);
      }
    }
  });

  it('the tangent placed passes through P, touches, and is the steeper of the two', () => {
    for (const { slide, where } of slides('coord-outside-tangent-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const circle = circleIn(slide);
      const [px, py] = pointIn(slide, 'P');
      const line = lineOf(filled(slide));
      expect(line.m * px + line.c, `${where}: through P`).toBeCloseTo(py, 9);
      expect(meeting(circle, line).D, `${where}: touches`).toBeCloseTo(0, 6);
      // The tangent condition through P is a quadratic in m; the answer is its larger root.
      const g = (m: number) => meeting(circle, { m, c: py - m * px }).D;
      const [linear, square] = [(g(1) - g(-1)) / 2, (g(1) + g(-1)) / 2 - g(0)];
      const other = -linear / square - line.m;
      expect(line.m, where).toBeGreaterThan(other);
    }
  });
});

describe('chords, checked from what the learner sees', () => {
  it('the chord length from its midpoint matches a chord drawn through it', () => {
    for (const { slide, where } of slides('coord-chord-half-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const circle = circleIn(slide);
      const [mx, my] = pointIn(slide, 'M');
      // The chord with midpoint M is perpendicular to CM: walk along it to the circle both ways.
      const [ux, uy] = [-(my - circle.b), mx - circle.a];
      const t = Math.sqrt(-onCircle(circle, mx, my) / (ux * ux + uy * uy));
      for (const sign of [-1, 1]) {
        expect(onCircle(circle, mx + sign * t * ux, my + sign * t * uy), where).toBeCloseTo(0, 9);
      }
      const length = 2 * t * Math.sqrt(ux * ux + uy * uy);
      expect(Number(slide.answer[slide.answer.length - 1]), where).toBeCloseTo(length, 9);
    }
  });

  it('the radius, or the missing number, puts a chord that long through M', () => {
    for (const { slide, where } of slides('coord-chord-radius')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const [mx, my] = pointIn(slide, 'M');
      const length = Number(/length \$(\d+)\$/.exec(prose(slide))![1]);
      const shown = texts(slide).find((tex) => tex.includes('+ k'));
      let circle: Circle;
      if (shown) {
        circle = circleOf(shown.replace('k', `(${slide.answer})`));
      } else {
        const [a, b] = pointIn(slide, 'C');
        circle = { a, b, r2: Number(slide.answer) };
      }
      expect(-onCircle(circle, mx, my), `${where}: M inside`).toBeGreaterThan(0);
      expect(2 * Math.sqrt(-onCircle(circle, mx, my)), where).toBeCloseTo(length, 9);
    }
  });

  it('the midpoint worked out is halfway between where the line crosses', () => {
    for (const { slide, where } of slides('coord-chord-midpoint-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const [[x1, y1], [x2, y2]] = crossings(circleIn(slide), lineIn(slide));
      const last = slide.reductions[slide.reductions.length - 1].value;
      const [, mx, my] = /^M = \((-?\d+), (-?\d+)\)$/.exec(last)!;
      expect(Number(mx), where).toBeCloseTo((x1 + x2) / 2, 9);
      expect(Number(my), where).toBeCloseTo((y1 + y2) / 2, 9);
    }
  });

  it('the slider lands on the midpoint of the chord the line cuts', () => {
    for (const { slide, where } of slides('coord-chord-slider')) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const [[x1, y1], [x2, y2]] = crossings(circleIn(slide), lineIn(slide));
      const target = slide.readout.startsWith('x') ? (x1 + x2) / 2 : (y1 + y2) / 2;
      expect(slide.answer, where).toBeCloseTo(target, 9);
    }
  });
});

describe('circle theorems on axes, checked from what the learner sees', () => {
  type P2 = [number, number];

  /** A number as the learner reads it: 3, -\frac{2}{3}. */
  const numberOf = (tex: string) => math.evaluate(toMath(tex.replace(/^\$|\$$/g, ''))) as number;

  /** The angle at P between PA and PB is right: the dot product of the two arms is zero. */
  const rightAt = (A: P2, B: P2, P: P2) => (A[0] - P[0]) * (B[0] - P[0]) + (A[1] - P[1]) * (B[1] - P[1]) === 0;

  /** The point as far from P, Q and R alike, by solving the two bisector conditions from scratch. */
  function circumcentre([P, Q, R]: P2[]): P2 {
    const row = (X: P2, Y: P2) => [2 * (Y[0] - X[0]), 2 * (Y[1] - X[1]), Y[0] ** 2 + Y[1] ** 2 - X[0] ** 2 - X[1] ** 2];
    const [a1, b1, c1] = row(P, Q);
    const [a2, b2, c2] = row(Q, R);
    const det = a1 * b2 - a2 * b1;
    return [(c1 * b2 - c2 * b1) / det, (a1 * c2 - a2 * c1) / det];
  }

  const onIt = (circle: Circle, [x, y]: P2) => onCircle(circle, x, y);

  /** The centre, from C(a, b) in the prompt or else from the circle's equation. */
  function centreIn(slide: Slide): P2 {
    if (/C\(-?\d+, -?\d+\)/.test(prose(slide))) return pointIn(slide, 'C');
    const { a, b } = circleIn(slide);
    return [a, b];
  }

  it('the gradients of AP and BP are the ones shown and multiply to -1', () => {
    for (const { slide, where } of slides('coord-semicircle-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const A = pointIn(slide, 'A');
      const P = pointIn(slide, 'P');
      let B: P2;
      if (prose(slide).includes('has a diameter')) {
        const circle = circleIn(slide);
        B = [2 * circle.a - A[0], 2 * circle.b - A[1]];
        expect(onIt(circle, A), `${where}: A on the circle`).toBeCloseTo(0, 9);
        expect(onIt(circle, P), `${where}: P on the circle`).toBeCloseTo(0, 9);
      } else B = pointIn(slide, 'B');
      const [m1, m2, product] = slide.answer.map(numberOf);
      expect(m1, where).toBeCloseTo((P[1] - A[1]) / (P[0] - A[0]), 9);
      expect(m2, where).toBeCloseTo((P[1] - B[1]) / (P[0] - B[0]), 9);
      expect(product, where).toBeCloseTo(m1 * m2, 9);
      expect(rightAt(A, B, P), `${where}: a right angle at P`).toBe(true);
    }
  });

  it('the product picked is the real one, and the verdict is right exactly when P sees AB square on', () => {
    for (const { slide, where } of slides('coord-right-angle-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const [A, B, P] = ['A', 'B', 'P'].map((name) => pointIn(slide, name));
      const product = ((P[1] - A[1]) / (P[0] - A[0])) * ((P[1] - B[1]) / (P[0] - B[0]));
      expect(numberOf(slide.answer[0]), where).toBeCloseTo(product, 9);
      expect(slide.answer[1], where).toBe(rightAt(A, B, P) ? 'Yes' : 'No');
    }
  });

  it('the missing coordinate puts B where AP and BP meet square on', () => {
    for (const { slide, where } of slides('coord-semicircle-missing')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const A = pointIn(slide, 'A');
      const P = pointIn(slide, 'P');
      const bx = Number(/B\((-?\d+), k\)/.exec(prose(slide))![1]);
      const B: P2 = [bx, Number(slide.answer)];
      expect(rightAt(A, B, P), where).toBe(true);
      expect(B[0] === P[0] && B[1] === P[1], `${where}: B is not P`).toBe(false);
    }
  });

  it('exactly the point marked right makes APB a right angle', () => {
    for (const { slide, where } of slides('coord-right-angle-point')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const A = pointIn(slide, 'A');
      const B = pointIn(slide, 'B');
      for (const option of slide.options) {
        const [, x, y] = /^\((-?\d+), (-?\d+)\)$/.exec(option.label)!;
        const P: P2 = [Number(x), Number(y)];
        expect(rightAt(A, B, P), `${where}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });

  /** The circle on diameter AB: centred at the midpoint, through both ends. */
  function expectOnDiameter(circle: Circle, A: P2, B: P2, where: string) {
    expect(circle.a, `${where}: centre x`).toBeCloseTo((A[0] + B[0]) / 2, 9);
    expect(circle.b, `${where}: centre y`).toBeCloseTo((A[1] + B[1]) / 2, 9);
    expect(onIt(circle, A), `${where}: A on the circle`).toBeCloseTo(0, 9);
    expect(onIt(circle, B), `${where}: B on the circle`).toBeCloseTo(0, 9);
  }

  it('the circle built on a diameter has it as a diameter', () => {
    for (const { slide, where } of slides('coord-diameter-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      expectOnDiameter(circleOf(filled(slide)), pointIn(slide, 'A'), pointIn(slide, 'B'), where);
    }
    for (const { slide, where } of slides('coord-diameter-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const last = slide.reductions[slide.reductions.length - 1].value;
      expectOnDiameter(circleOf(last), pointIn(slide, 'A'), pointIn(slide, 'B'), where);
    }
    for (const { slide, where } of slides('coord-diameter-r2')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const A = pointIn(slide, 'A');
      const B = pointIn(slide, 'B');
      const shown = texts(slide).find((tex) => tex.includes('+ k'));
      const circle = shown
        ? circleOf(shown.replace('k', `(${slide.answer})`))
        : { a: (A[0] + B[0]) / 2, b: (A[1] + B[1]) / 2, r2: Number(slide.answer) };
      expectOnDiameter(circle, A, B, where);
    }
  });

  it('the slider lands on the midpoint of the diameter drawn', () => {
    for (const { slide, where } of slides('coord-diameter-slider')) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const [A, B] = [pointIn(slide, 'A'), pointIn(slide, 'B')];
      const axis = slide.readout.startsWith('x') ? 0 : 1;
      expect(slide.answer, where).toBeCloseTo((A[axis] + B[axis]) / 2, 9);
    }
  });

  it('the bisector found is equidistant from P and Q, and passes through the centre of all three', () => {
    for (const { slide, where } of slides('coord-three-bisector-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const points = ['P', 'Q', 'R'].map((name) => pointIn(slide, name));
      const line = lineOf(slide.reductions[slide.reductions.length - 1].value);
      for (const x of XS) {
        const X: P2 = [x, line.m * x + line.c];
        const d = (Y: P2) => (X[0] - Y[0]) ** 2 + (X[1] - Y[1]) ** 2;
        expect(d(points[0]), `${where} at x = ${x}`).toBeCloseTo(d(points[1]), 6);
      }
      const [cx, cy] = circumcentre(points);
      expect(line.m * cx + line.c, `${where}: through the centre`).toBeCloseTo(cy, 9);
    }
  });

  it('the centre found is equidistant from all three points, and on both bisectors shown', () => {
    for (const { slide, where } of slides('coord-circumcentre-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const points = ['P', 'Q', 'R'].map((name) => pointIn(slide, name));
      const [x, y, r2] = slide.answer.map(Number);
      const [cx, cy] = circumcentre(points);
      expect(x, where).toBeCloseTo(cx, 9);
      expect(y, where).toBeCloseTo(cy, 9);
      for (const P of points) expect(onIt({ a: x, b: y, r2 }, P), `${where}: ${P} on the circle`).toBeCloseTo(0, 9);
      for (const tex of slide.expression.replace(/\\begin\{gathered\}|\\end\{gathered\}/g, '').split('\\\\')) {
        expect(equation(tex.trim())(x, y), `${where}: C on ${tex}`).toBeCloseTo(0, 9);
      }
    }
  });

  it('the circle through three points passes through all three', () => {
    for (const { slide, where } of slides('coord-three-points-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const circle = circleOf(filled(slide));
      for (const name of ['P', 'Q', 'R']) expect(onIt(circle, pointIn(slide, name)), `${where}: ${name}`).toBeCloseTo(0, 9);
    }
    for (const { slide, where } of slides('coord-three-points-r2')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const points = ['P', 'Q', 'R'].map((name) => pointIn(slide, name));
      const [a, b] = circumcentre(points);
      for (const P of points) expect(onIt({ a, b, r2: Number(slide.answer) }, P), `${where}: ${P}`).toBeCloseTo(0, 9);
    }
  });

  it('the fact picked fits the scene, and the gradient is the one it gives', () => {
    for (const { slide, where } of slides('coord-chord-fact-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const text = prose(slide);
      let from: P2;
      let to: P2;
      let fact: string;
      if (text.includes('midpoint of a chord')) {
        [from, to, fact] = [centreIn(slide), pointIn(slide, 'M'), 'midpoint of a chord'];
        if (!/C\(/.test(text)) expect(onIt(circleIn(slide), to), `${where}: M inside`).toBeLessThan(0);
      } else if (text.includes('tangent')) {
        [from, to, fact] = [centreIn(slide), pointIn(slide, 'T'), 'tangent'];
        expect(onIt(circleIn(slide), to), `${where}: T on the circle`).toBeCloseTo(0, 9);
      } else {
        [from, to, fact] = [pointIn(slide, 'A'), pointIn(slide, 'P'), 'semicircle'];
      }
      expect(slide.answer[0], where).toContain(fact);
      expect(numberOf(slide.answer[1]), where).toBeCloseTo(-(to[0] - from[0]) / (to[1] - from[1]), 9);
    }
  });

  it('the distance to the chord is the perpendicular distance from the centre to AB', () => {
    for (const { slide, where } of slides('coord-chord-distance')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const [A, B] = [pointIn(slide, 'A'), pointIn(slide, 'B')];
      const [a, b] = centreIn(slide);
      const cross = (B[0] - A[0]) * (b - A[1]) - (B[1] - A[1]) * (a - A[0]);
      expect(Number(slide.answer), where).toBeCloseTo(Math.abs(cross) / Math.hypot(B[0] - A[0], B[1] - A[1]), 9);
      const r2 = (A[0] - a) ** 2 + (A[1] - b) ** 2;
      expect(onIt({ a, b, r2 }, B), `${where}: B on the same circle`).toBeCloseTo(0, 9);
      if (!/C\(/.test(prose(slide))) expect(circleIn(slide).r2, where).toBeCloseTo(r2, 9);
    }
  });

  it('the tangent placed touches the circle through A and B at A', () => {
    for (const { slide, where } of slides('coord-chord-tangent-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const [A, B] = [pointIn(slide, 'A'), pointIn(slide, 'B')];
      // The centre (0, t) or (t, t), from CA^2 = CB^2 solved afresh.
      const g = prose(slide).includes('$y$-axis') ? (t: number): P2 => [0, t] : (t: number): P2 => [t, t];
      const gap = (t: number) => onIt({ a: g(t)[0], b: g(t)[1], r2: 0 }, A) - onIt({ a: g(t)[0], b: g(t)[1], r2: 0 }, B);
      const t = -gap(0) / (gap(1) - gap(0));
      const [a, b] = g(t);
      const circle = { a, b, r2: (A[0] - a) ** 2 + (A[1] - b) ** 2 };
      expect(onIt(circle, B), `${where}: B on the circle`).toBeCloseTo(0, 9);
      const line = lineOf(filled(slide));
      expect(line.m * A[0] + line.c, `${where}: through A`).toBeCloseTo(A[1], 9);
      expect(meeting(circle, line).D, `${where}: touches`).toBeCloseTo(0, 6);
    }
  });

  it('the chord built from its midpoint passes through it, square on to CM', () => {
    for (const { slide, where } of slides('coord-chord-from-midpoint-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const M = pointIn(slide, 'M');
      const [a, b] = centreIn(slide);
      const [cm, m, c] = slide.answer.map(numberOf);
      expect(cm, where).toBeCloseTo((M[1] - b) / (M[0] - a), 9);
      expect(m * cm, `${where}: perpendicular`).toBeCloseTo(-1, 9);
      expect(m * M[0] + c, `${where}: through M`).toBeCloseTo(M[1], 9);
      if (!/C\(/.test(prose(slide))) {
        // M inside, so the chord really cuts the circle and M is its midpoint.
        const [[x1, y1], [x2, y2]] = crossings(circleIn(slide), { m, c });
        expect((x1 + x2) / 2, where).toBeCloseTo(M[0], 9);
        expect((y1 + y2) / 2, where).toBeCloseTo(M[1], 9);
      }
    }
  });

  it('the fact offered as right is the one the scene asks for', () => {
    const keys: [RegExp, string][] = [
      [/angle \$APB\$/, 'semicircle'],
      [/leads to its centre/, 'bisector'],
      [/tangent at \$T\$/, 'tangent'],
      [/finds \$B\$/, 'midpoint of a diameter'],
    ];
    for (const { slide, where } of slides('coord-which-theorem')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const [, fact] = keys.find(([pattern]) => pattern.test(prose(slide)))!;
      expect(slide.options.find((o) => o.id === slide.correctId)?.label, where).toContain(fact);
      if (fact === 'semicircle') expect(rightAt(pointIn(slide, 'A'), pointIn(slide, 'B'), pointIn(slide, 'P')), where).toBe(true);
    }
  });

  it('the far end of the diameter is on the circle, with the centre halfway', () => {
    for (const id of ['coord-other-end-steps', 'coord-other-end-slider']) {
      for (const { slide, where } of slides(id)) {
        const circle = circleIn(slide);
        const A = pointIn(slide, 'A');
        expect(onIt(circle, A), `${where}: A on the circle`).toBeCloseTo(0, 9);
        const B: P2 = [2 * circle.a - A[0], 2 * circle.b - A[1]];
        if (slide.kind === 'steps') {
          const [, x, y] = /^B = \((-?\d+), (-?\d+)\)$/.exec(slide.reductions[slide.reductions.length - 1].value)!;
          expect([Number(x), Number(y)], where).toEqual(B);
        } else if (slide.kind === 'slider') {
          expect(slide.answer, where).toBe(slide.readout.startsWith('x') ? B[0] : B[1]);
        } else throw new Error(`unexpected ${slide.kind}`);
      }
    }
  });

  it('the tangent at the far end is parallel to the one at A, and touches', () => {
    for (const { slide, where } of slides('coord-parallel-tangent')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const circle = circleIn(slide);
      const A = pointIn(slide, 'A');
      const atA = lineIn(slide);
      expect(atA.m * A[0] + atA.c, `${where}: the tangent shown is through A`).toBeCloseTo(A[1], 9);
      expect(meeting(circle, atA).D, `${where}: the tangent shown touches`).toBeCloseTo(0, 6);
      const tex = texts(slide).find((t) => /^y = .* \+ c$/.test(t))!;
      const atB = lineOf(tex.replace(/\+ c$/, `+ (${slide.answer})`));
      expect(atB.m, `${where}: parallel`).toBeCloseTo(atA.m, 9);
      expect(atB.c, `${where}: a different line`).not.toBeCloseTo(atA.c, 9);
      expect(meeting(circle, atB).D, `${where}: touches`).toBeCloseTo(0, 6);
    }
  });
});

describe('coordinate proof, checked from what the learner sees', () => {
  type P2 = [number, number];

  /** A number as the learner reads it: 3, -\frac{2}{3}. */
  const numberOf = (tex: string) => math.evaluate(toMath(tex.replace(/^\$|\$$/g, '').trim())) as number;

  const slope = (P: P2, R: P2) => (R[1] - P[1]) / (R[0] - P[0]);
  const minus = (P: P2, R: P2): P2 => [P[0] - R[0], P[1] - R[1]];
  const dot = (u: P2, v: P2) => u[0] * v[0] + u[1] * v[1];
  const cross = (u: P2, v: P2) => u[0] * v[1] - u[1] * v[0];
  const d2 = (P: P2, R: P2) => dot(minus(R, P), minus(R, P));
  const mid = (P: P2, R: P2): P2 => [(P[0] + R[0]) / 2, (P[1] + R[1]) / 2];
  const parallel = (P: P2, Q: P2, R: P2, S: P2) => cross(minus(Q, P), minus(S, R)) === 0;
  const pointTex = (tex: string): P2 => {
    const match = /\((-?\d+), (-?\d+)\)/.exec(tex);
    if (!match) throw new Error(`no point in ${tex}`);
    return [Number(match[1]), Number(match[2])];
  };

  const corners = (slide: Slide) => ['A', 'B', 'C', 'D'].map((name) => pointIn(slide, name)) as [P2, P2, P2, P2];
  const isParallelogram = ([A, B, C, D]: P2[]) => A[0] + C[0] === B[0] + D[0] && A[1] + C[1] === B[1] + D[1];

  /** The strongest name, from the sides at B alone, for a parallelogram. */
  function nameOf([A, B, C]: P2[]): string {
    const right = dot(minus(A, B), minus(C, B)) === 0;
    const equal = d2(A, B) === d2(B, C);
    if (right && equal) return 'square';
    if (right) return 'rectangle';
    return equal ? 'rhombus' : 'parallelogram';
  }

  /** "$a$ and $b$" as two numbers. */
  const pairOf = (label: string) => label.split(' and ').map(numberOf);

  it('the gradients picked are the real ones, and the verdict counts the parallel pairs', () => {
    for (const { slide, where } of slides('coord-para-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const [A, B, C, D] = corners(slide);
      const [ab, dc] = pairOf(slide.answer[0]);
      const [ad, bc] = pairOf(slide.answer[1]);
      expect(ab, where).toBeCloseTo(slope(A, B), 9);
      expect(dc, where).toBeCloseTo(slope(D, C), 9);
      expect(ad, where).toBeCloseTo(slope(A, D), 9);
      expect(bc, where).toBeCloseTo(slope(B, C), 9);
      const pairs = Number(parallel(A, B, D, C)) + Number(parallel(A, D, B, C));
      expect(slide.answer[2], where).toBe(['Neither', 'A trapezium', 'A parallelogram'][pairs]);
      if (pairs === 2) expect(isParallelogram([A, B, C, D]), where).toBe(true);
    }
  });

  it('the midpoints are the averages, and the verdict is right exactly when they meet', () => {
    for (const { slide, where } of slides('coord-para-diagonal-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const [A, B, C, D] = corners(slide);
      const [ac, bd, verdict] = slide.reductions.map((step) => step.value);
      expect(pointTex(ac), where).toEqual(mid(A, C));
      expect(pointTex(bd), where).toEqual(mid(B, D));
      const meets = isParallelogram([A, B, C, D]);
      expect(verdict.includes('not'), where).toBe(!meets);
      expect(parallel(A, B, D, C) && parallel(A, D, B, C), `${where}: sides agree`).toBe(meets);
    }
  });

  it('the corner placed completes a parallelogram', () => {
    for (const { slide, where } of slides('coord-para-fourth-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const letter = slide.template[0];
      const X = pointTex(filled(slide));
      const P = ['A', 'B', 'C', 'D'].map((name) => (name === letter ? X : pointIn(slide, name)));
      expect(isParallelogram(P), where).toBe(true);
      expect(parallel(P[0], P[1], P[3], P[2]) && parallel(P[0], P[3], P[1], P[2]), where).toBe(true);
    }
  });

  it('the height found puts DC parallel to AB', () => {
    for (const { slide, where } of slides('coord-parallel-k')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const [A, B, C] = ['A', 'B', 'C'].map((name) => pointIn(slide, name));
      const D: P2 = [Number(/D\((-?\d+), k\)/.exec(prose(slide))![1]), Number(slide.answer)];
      expect(parallel(A, B, D, C), where).toBe(true);
      expect(D[0] === C[0], `${where}: D is not straight above C`).toBe(false);
    }
  });

  it('the slider lands on the fourth corner', () => {
    for (const { slide, where } of slides('coord-para-slider')) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const [A, B, C] = ['A', 'B', 'C'].map((name) => pointIn(slide, name));
      const D: P2 = [A[0] + C[0] - B[0], A[1] + C[1] - B[1]];
      expect(slide.answer, where).toBe(slide.readout.startsWith('x') ? D[0] : D[1]);
    }
  });

  it('the product at B is the real one, and a rectangle is called one exactly when B is square', () => {
    for (const { slide, where } of slides('coord-rect-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const [A, B, C, D] = corners(slide);
      expect(isParallelogram([A, B, C, D]), `${where}: a parallelogram`).toBe(true);
      expect(numberOf(slide.answer[0]), where).toBeCloseTo(slope(A, B) * slope(B, C), 9);
      expect(slide.answer[1], where).toBe(dot(minus(A, B), minus(C, B)) === 0 ? 'Yes' : 'No');
    }
  });

  it('the diagonals are measured from the corners', () => {
    for (const { slide, where } of slides('coord-diagonals-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const [A, B, C, D] = corners(slide);
      expect(isParallelogram([A, B, C, D]), `${where}: a parallelogram`).toBe(true);
      const [ac, bd] = [minus(C, A), minus(D, B)];
      expect(slide.answer.map(Number), where).toEqual([ac[0], ac[1], d2(A, C), bd[0], bd[1], d2(B, D)]);
    }
  });

  it('the height found makes the angle at B a right angle', () => {
    for (const { slide, where } of slides('coord-rect-k')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const [A, B] = ['A', 'B'].map((name) => pointIn(slide, name));
      const C: P2 = [Number(/C\((-?\d+), k\)/.exec(prose(slide))![1]), Number(slide.answer)];
      expect(dot(minus(A, B), minus(C, B)), where).toBe(0);
    }
  });

  it('the squared sides are the real ones', () => {
    for (const { slide, where } of slides('coord-side-lengths-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const [A, B, C, D] = corners(slide);
      expect(isParallelogram([A, B, C, D]), `${where}: a parallelogram`).toBe(true);
      expect(slide.answer.map(Number), where).toEqual([d2(A, B), d2(B, C)]);
    }
  });

  it('the diagonals product is the real one, and a rhombus is called one exactly when its sides are equal', () => {
    for (const { slide, where } of slides('coord-rhombus-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const [A, B, C, D] = corners(slide);
      expect(isParallelogram([A, B, C, D]), `${where}: a parallelogram`).toBe(true);
      expect(numberOf(slide.answer[0]), where).toBeCloseTo(slope(A, C) * slope(B, D), 9);
      expect(slide.answer[1], where).toBe(d2(A, B) === d2(B, C) ? 'Yes' : 'No');
    }
  });

  it('the name offered as right is the strongest the corners earn', () => {
    for (const { slide, where } of slides('coord-name-quad')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const P = corners(slide);
      expect(isParallelogram(P), `${where}: a parallelogram`).toBe(true);
      for (const option of slide.options) {
        expect(option.label.toLowerCase().endsWith(nameOf(P)), `${where}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });

  it('each line of the square test is worked from the corners, and the name follows', () => {
    for (const { slide, where } of slides('coord-square-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const P = corners(slide);
      const [A, B, C] = P;
      const [ab, bc, product, name] = slide.reductions.map((step) => step.value);
      expect(numberOf(ab.split('=')[1]), where).toBe(d2(A, B));
      expect(numberOf(bc.split('=')[1]), where).toBe(d2(B, C));
      expect(numberOf(product.split('=')[1]), where).toBeCloseTo(slope(A, B) * slope(B, C), 9);
      expect(name, where).toContain(`a ${nameOf(P)}`);
    }
  });

  const triangle = (slide: Slide) => ['P', 'Q', 'R'].map((name) => pointIn(slide, name));

  /** The corner at which the triangle is square, by dot products; -1 for none. */
  const rightCorner = (T: P2[]) => T.findIndex((X, i) => dot(minus(T[(i + 1) % 3], X), minus(T[(i + 2) % 3], X)) === 0);

  it('the gradients at the corner named are the real ones, and it is square there', () => {
    for (const { slide, where } of slides('coord-tri-right-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const T = triangle(slide);
      const at = 'PQR'.indexOf(/right-angled at \$([PQR])\$/.exec(prose(slide))![1]);
      const [m1, m2, product] = slide.answer.map(numberOf);
      expect(m1, where).toBeCloseTo(slope(T[at], T[(at + 1) % 3]), 9);
      expect(m2, where).toBeCloseTo(slope(T[at], T[(at + 2) % 3]), 9);
      expect(product, where).toBeCloseTo(m1 * m2, 9);
      expect(rightCorner(T), where).toBe(at);
    }
  });

  it('the corner picked is the one Pythagoras names, or none', () => {
    for (const { slide, where } of slides('coord-tri-vertex-choice')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const corner = rightCorner(triangle(slide));
      const right = corner >= 0 ? `At ${'PQR'[corner]}` : 'It has no right angle';
      expect(slide.options.find((o) => o.id === slide.correctId)?.label, where).toBe(right);
    }
  });

  it('the squared sides picked are the real ones, and the equal pair is the one that is', () => {
    for (const { slide, where } of slides('coord-isosceles-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const [P, Q, R] = triangle(slide);
      const lengths = [d2(P, Q), d2(Q, R), d2(R, P)];
      const shown = [...slide.answer[0].matchAll(/\^2 = (-?\d+)/g)].map((match) => Number(match[1]));
      expect(shown, where).toEqual(lengths);
      const pair = slide.answer[1];
      if (pair.startsWith('None')) expect(new Set(lengths).size, where).toBe(3);
      else {
        const [, s, t] = /\$(\w\w) = (\w\w)\$/.exec(pair)!;
        const of = (side: string) => lengths[['PQ', 'QR', 'RP'].indexOf(side)];
        expect(of(s), where).toBe(of(t));
      }
    }
  });

  it('the height found makes the triangle square at the corner named', () => {
    for (const { slide, where } of slides('coord-tri-right-k')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const text = prose(slide);
      const at = 'PQR'.indexOf(/right-angled at \$([PQR])\$/.exec(text)![1]);
      const T = ['P', 'Q', 'R'].map((name) => {
        const unknown = new RegExp(`${name}\\((-?\\d+), k\\)`).exec(text);
        return unknown ? ([Number(unknown[1]), Number(slide.answer)] as P2) : pointIn(slide, name);
      });
      expect(rightCorner(T), where).toBe(at);
    }
  });

  it('every step of the proof holds for the corners, and the shape claimed is the one they make', () => {
    for (const { slide, where } of slides('coord-proof-order')) {
      if (slide.kind !== 'order') throw new Error('expected order');
      const P = corners(slide);
      const [A, B, C, D] = P;
      const shape = /Prove that it is a (\w+)/.exec(prose(slide))![1];
      expect(isParallelogram(P), `${where}: a parallelogram`).toBe(true);
      expect(nameOf(P), where).toBe(shape);
      const at: Record<string, P2> = { A, B, C, D };
      const gradient = (label: string) => slope(at[label[0]], at[label[1]]);
      const proof = slide.answer.map((id) => slide.steps.find((step) => step.id === id)!.text);
      for (const step of proof) {
        for (const [, tex] of step.matchAll(/\$([^$]+)\$/g)) {
          const sides = [...tex.matchAll(/m_\{(\w\w)\}/g)].map((match) => match[1]);
          const parts = tex.split(' = ');
          if (tex.includes('\\times')) {
            const [a, b] = parts[1].split('\\times').map((part) => numberOf(part.replace(/\\left\(|\\right\)/g, '')));
            expect([a, b], `${where}: ${tex}`).toEqual([gradient(sides[0]), gradient(sides[1])].map((m) => expect.closeTo(m, 9)));
            expect(gradient(sides[0]) * gradient(sides[1]), `${where}: ${tex}`).toBeCloseTo(-1, 9);
          } else if (sides.length > 0) {
            for (const side of sides) expect(gradient(side), `${where}: ${tex}`).toBeCloseTo(numberOf(parts[parts.length - 1]), 9);
          } else if (tex.startsWith('M_')) {
            expect(pointTex(tex), `${where}: ${tex}`).toEqual(mid(A, C));
            expect(pointTex(tex), `${where}: ${tex}`).toEqual(mid(B, D));
          }
        }
      }
    }
  });

  it('exactly the point marked right completes the shape named', () => {
    for (const { slide, where } of slides('coord-complete-choice')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const [A, B, C] = ['A', 'B', 'C'].map((name) => pointIn(slide, name));
      const shape = /corners of an? (\w+)/.exec(prose(slide))![1];
      for (const option of slide.options) {
        const P = [A, B, C, pointTex(option.label)];
        const makes = isParallelogram(P) && nameOf(P) === shape;
        expect(makes, `${where}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });

  it('the figure fails exactly one test for a square, and that one is marked', () => {
    for (const { slide, where } of slides('coord-fails-one-choice')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const [A, B, C, D] = corners(slide);
      const passes: Record<string, boolean> = {
        'Both pairs of opposite sides parallel': parallel(A, B, D, C) && parallel(A, D, B, C),
        'A right angle at B': dot(minus(A, B), minus(C, B)) === 0,
        'AB = BC': d2(A, B) === d2(B, C),
      };
      expect(Object.values(passes).filter((pass) => !pass), where).toHaveLength(1);
      for (const option of slide.options) {
        expect(passes[option.label], `${where}: ${option.label}`).toBe(option.id !== slide.correctId);
      }
    }
  });
});

describe('areas and loci, checked from what the learner sees', () => {
  type P2 = [number, number];

  const numberOf = (tex: string) =>
    math.evaluate(toMath(tex.replace(/^\$|\$$/g, '').replace(/\\tfrac/g, '\\frac').replace(/\\text\{[^}]*\}\s*=/, '').trim())) as number;

  const minus = (P: P2, R: P2): P2 => [P[0] - R[0], P[1] - R[1]];
  const dot = (u: P2, v: P2) => u[0] * v[0] + u[1] * v[1];
  // `+ 0` so a zero product is 0, never -0.
  const cross = (u: P2, v: P2) => u[0] * v[1] - u[1] * v[0] + 0;
  const d2 = (P: P2, R: P2) => dot(minus(R, P), minus(R, P));

  /** Twice the signed area, by a shoelace written out afresh here. */
  const shoelace = (P: P2[]) => P.reduce((sum, X, i) => sum + cross(X, P[(i + 1) % P.length]), 0);
  const areaOf = (P: P2[]) => Math.abs(shoelace(P)) / 2;

  const corners = (slide: Slide, names = ['A', 'B', 'C']) => names.map((name) => pointIn(slide, name));

  /** The number the prompt gives as an area. */
  const statedArea = (slide: Slide) => {
    const match = /area (?:of \$ABC\$ )?(?:is )?\$(\d+)\$/.exec(prose(slide));
    if (!match) throw new Error(`no area in ${prose(slide)}`);
    return Number(match[1]);
  };

  /** Whether any side of a triangle is level: straight across or straight up. */
  const hasLevelSide = (T: P2[]) => T.some((X, i) => {
    const Y = T[(i + 1) % 3];
    return X[0] === Y[0] || X[1] === Y[1];
  });

  /** The smallest box with sides on the grid round some points. */
  const boxArea = (P: P2[]) => {
    const xs = P.map((X) => X[0]);
    const ys = P.map((X) => X[1]);
    return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
  };

  /** C from a prompt that writes one of its coordinates as k, with k put in. */
  const unknownC = (slide: Slide, k: number): P2 => {
    const text = prose(slide);
    const across = /C\((-?\d+), k\)/.exec(text);
    if (across) return [Number(across[1]), k];
    const up = /C\(k, (-?\d+)\)/.exec(text);
    if (!up) throw new Error(`no C with k in ${text}`);
    return [k, Number(up[1])];
  };

  /** Which side of the line through A and B a point is: the sign of the cross product. */
  const sideOf = (A: P2, B: P2, X: P2) => Math.sign(cross(minus(B, A), minus(X, A)));

  /** The side the prompt says C is on, as a check on C itself. */
  function onStatedSide(slide: Slide, A: P2, B: P2, C: P2): boolean {
    const text = prose(slide);
    if (text.includes('above')) return C[1] > A[1] && A[1] === B[1];
    if (text.includes('below')) return C[1] < A[1] && A[1] === B[1];
    if (text.includes('to the right of')) return C[0] > A[0] && A[0] === B[0];
    if (text.includes('to the left of')) return C[0] < A[0] && A[0] === B[0];
    throw new Error(`no side in ${text}`);
  }

  it('the typed area of a triangle with a level side is its shoelace area', () => {
    for (const { slide, where } of slides('coord-tri-area')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const T = corners(slide);
      expect(hasLevelSide(T), `${where}: a level side`).toBe(true);
      expect(Number(slide.answer), where).toBe(areaOf(T));
    }
  });

  it('the base is the level side, the height makes the area, and the area is the shoelace one', () => {
    for (const { slide, where } of slides('coord-base-height-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const T = corners(slide);
      const [b, h, area] = slide.answer.map(Number);
      const levels = T.map((X, i) => [X, T[(i + 1) % 3]] as [P2, P2]).filter(([X, Y]) => X[0] === Y[0] || X[1] === Y[1]);
      expect(levels.map(([X, Y]) => Math.sqrt(d2(X, Y))), `${where}: the base is a level side`).toContain(b);
      expect(area, where).toBe(areaOf(T));
      expect(b * h, where).toBe(2 * area);
    }
  });

  it('exactly the calculation marked right comes to the area', () => {
    for (const { slide, where } of slides('coord-half-base-choice')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const area = areaOf(corners(slide));
      for (const option of slide.options) {
        expect(numberOf(option.label) === area, `${where}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });

  it('the k found gives the area stated, with C on the side stated', () => {
    for (const id of ['coord-apex-k', 'coord-apex-slider']) {
      for (const { slide, where } of slides(id)) {
        const [A, B] = corners(slide, ['A', 'B']);
        let C: P2;
        if (slide.kind === 'expression') C = unknownC(slide, Number(slide.answer));
        else if (slide.kind === 'slider') {
          const line = /dashed line \$([xy]) = (-?\d+)\$/.exec(prose(slide))!;
          C = line[1] === 'x' ? [Number(line[2]), slide.answer] : [slide.answer, Number(line[2])];
        } else throw new Error(`unexpected ${slide.kind}`);
        expect(areaOf([A, B, C]), where).toBe(statedArea(slide));
        expect(onStatedSide(slide, A, B, C), `${where}: C ${C} on the side stated`).toBe(true);
      }
    }
  });

  it('the box steps start from the real box and end on the shoelace area', () => {
    for (const { slide, where } of slides('coord-box-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const T = corners(slide);
      expect(hasLevelSide(T), `${where}: no level side`).toBe(false);
      const values = slide.reductions.map((step) => numberOf(step.value));
      expect(values[0], where).toBe(boxArea(T));
      expect(values[1] + values[2] + values[3], where).toBe(boxArea(T) - areaOf(T));
      expect(values[4], where).toBe(areaOf(T));
    }
  });

  it('the box flow picks the box, the corners it leaves and the shoelace area', () => {
    for (const { slide, where } of slides('coord-box-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const T = corners(slide);
      const [box, cut, area] = slide.answer.map(numberOf);
      expect([box, cut, area], where).toEqual([boxArea(T), boxArea(T) - areaOf(T), areaOf(T)]);
    }
  });

  it('the shoelace tree holds each cross term, their sum and half its size', () => {
    for (const { slide, where } of slides('coord-shoelace-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const [A, B, C] = corners(slide);
      const terms = [cross(A, B), cross(B, C), cross(C, A)];
      expect(slide.answer.map(Number), where).toEqual([...terms, shoelace([A, B, C]), areaOf([A, B, C])]);
    }
  });

  it('the typed area of a triangle with no level side is its shoelace area', () => {
    for (const { slide, where } of slides('coord-box-area')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const T = corners(slide);
      expect(hasLevelSide(T), `${where}: no level side`).toBe(false);
      expect(Number(slide.answer), where).toBe(areaOf(T));
    }
  });

  const QUAD4 = ['A', 'B', 'C', 'D'];

  it('the two triangles named are the ones measured, and they make up the quadrilateral', () => {
    for (const { slide, where } of slides('coord-quad-split-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const P = corners(slide, QUAD4);
      const [, one, two] = /triangles \$(\w{3})\$ and \$(\w{3})\$/.exec(prose(slide))!;
      const of = (name: string) => areaOf([...name].map((letter) => P[QUAD4.indexOf(letter)]));
      const [a1, a2, whole] = slide.answer.map(Number);
      expect([a1, a2], where).toEqual([of(one), of(two)]);
      expect(whole, where).toBe(areaOf(P));
      expect(a1 + a2, `${where}: the diagonal is inside`).toBe(areaOf(P));
    }
  });

  it('a parallelogram has the area of all four corners, whether three or four are given', () => {
    for (const { slide, where } of slides('coord-para-area')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const [A, B, C] = corners(slide);
      const D: P2 = [A[0] + C[0] - B[0], A[1] + C[1] - B[1]];
      if (/D\(/.test(prose(slide))) expect(pointIn(slide, 'D'), where).toEqual(D);
      expect(Number(slide.answer), where).toBe(areaOf([A, B, C, D]));
    }
  });

  it('each shoelace term on a quadrilateral is its own cross product, and the area is half the sum', () => {
    for (const { slide, where } of slides('coord-poly-shoelace-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const P = corners(slide, QUAD4);
      const values = slide.reductions.map((step) => numberOf(step.value));
      expect(values.slice(0, 4), where).toEqual(P.map((X, i) => cross(X, P[(i + 1) % 4])));
      expect(values[4], where).toBe(shoelace(P));
      expect(values[5], where).toBe(areaOf(P));
    }
  });

  it('both values of k, and no others, give the area stated', () => {
    for (const { slide, where } of slides('coord-area-k-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const [A, B] = corners(slide, ['A', 'B']);
      const area = statedArea(slide);
      const working = Array.from({ length: 81 }, (_, i) => i - 40).filter((k) => areaOf([A, B, unknownC(slide, k)]) === area);
      expect(working, where).toEqual(slide.answer.map(Number).sort((x, y) => x - y));
      expect(sideOf(A, B, unknownC(slide, working[0])), `${where}: one either side`).toBe(-sideOf(A, B, unknownC(slide, working[1])));
    }
  });

  /**
   * Every point on a half-unit grid in a square, for testing a locus against
   * its condition. Half units, since a perpendicular bisector need pass
   * through no lattice point but always passes through the midpoint.
   */
  const LATTICE: P2[] = Array.from({ length: 61 * 61 }, (_, i) => [((i % 61) - 30) / 2, (Math.floor(i / 61) - 30) / 2]);

  /** The condition a prompt states, as a test on a point. */
  function conditionOf(slide: Slide): (P: P2) => boolean {
    const text = prose(slide);
    const fromPoint = /always \$(\d+)\$ from \$C\((-?\d+), (-?\d+)\)\$/.exec(text);
    if (fromPoint) {
      const [r, a, b] = fromPoint.slice(1).map(Number);
      return (P) => d2(P, [a, b]) === r * r;
    }
    const fromLine = /always \$(\d+)\$ from the line \$([xy]) = (-?\d+)\$/.exec(text);
    if (fromLine) {
      const [d, c] = [Number(fromLine[1]), Number(fromLine[3])];
      const i = fromLine[2] === 'x' ? 0 : 1;
      return (P) => Math.abs(P[i] - c) === d;
    }
    if (text.includes('as far from')) {
      const [A, B] = corners(slide, ['A', 'B']);
      return (P) => d2(P, A) === d2(P, B);
    }
    throw new Error(`no condition in ${text}`);
  }

  /** An equation, or two joined by "and", as a test on a point. */
  function satisfies(tex: string): (P: P2) => boolean {
    const parts = tex.replace(/^\$|\$$/g, '').split('\\text{ and }').map((part) => equation(part));
    return ([x, y]) => parts.some((f) => Math.abs(f(x, y)) < 1e-9);
  }

  /** The two sets agree on every lattice point, and the locus has some on it. */
  function sameLocus(a: (P: P2) => boolean, b: (P: P2) => boolean): boolean {
    return LATTICE.some(a) && LATTICE.every((P) => a(P) === b(P));
  }

  it('exactly the point marked right meets the condition', () => {
    for (const { slide, where } of slides('coord-locus-on-choice')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const holds = conditionOf(slide);
      for (const option of slide.options) {
        const [, x, y] = /\((-?\d+), (-?\d+)\)/.exec(option.label)!;
        expect(holds([Number(x), Number(y)]), `${where}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });

  it('the circle built from tiles is the locus the words describe', () => {
    for (const { slide, where } of slides('coord-locus-circle-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const C = pointIn(slide, 'C');
      const through = /Q\((-?\d+), (-?\d+)\)/.exec(prose(slide));
      const r2 = through ? d2(C, [Number(through[1]), Number(through[2])]) : Number(/always \$(\d+)\$/.exec(prose(slide))![1]) ** 2;
      const circle = circleOf(filled(slide));
      expect([circle.a, circle.b, circle.r2], where).toEqual([C[0], C[1], r2].map((v) => expect.closeTo(v, 9)));
    }
  });

  it('every line of the bisector working is equal to the one before, and the last is the locus', () => {
    for (const { slide, where } of slides('coord-locus-bisector-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const [A, B] = corners(slide, ['A', 'B']);
      const values = slide.reductions.map((step) => step.value);
      const at = (tex: string, [x, y]: P2) => math.evaluate(toMath(tex), { x, y }) as number;
      for (const P of [[0.3, -1.7], [2.1, 0.4]] as P2[]) {
        expect(at(values[0], P), where).toBeCloseTo(d2(P, A), 9);
        expect(at(values[1], P), where).toBeCloseTo(d2(P, B), 9);
      }
      expect(sameLocus(satisfies(values[values.length - 1]), conditionOf(slide)), where).toBe(true);
    }
  });

  it('the shape and the equation picked are the locus, and no other equation offered is', () => {
    for (const { slide, where } of slides('coord-locus-name-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const holds = conditionOf(slide);
      const text = prose(slide);
      const shape = text.includes('from the line') ? 'Two parallel lines' : text.includes('as far from') ? 'A straight line' : 'A circle';
      expect(slide.answer[0], where).toBe(shape);
      const fork = slide.steps.find((step) => step.id === 'equation')!;
      for (const branch of fork.branches) {
        expect(sameLocus(satisfies(branch.label), holds), `${where}: ${branch.label}`).toBe(branch.label === slide.answer[1]);
      }
    }
  });

  it('the point slid to is as far from A as from B', () => {
    for (const { slide, where } of slides('coord-locus-equidistant-slider')) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const [A, B] = corners(slide, ['A', 'B']);
      const line = /dashed line \$([xy]) = (-?\d+)\$/.exec(prose(slide))!;
      const P: P2 = line[1] === 'y' ? [slide.answer, Number(line[2])] : [Number(line[2]), slide.answer];
      expect(d2(P, A), where).toBe(d2(P, B));
    }
  });

  it('the two lines placed are the points the stated distance from the line', () => {
    for (const { slide, where } of slides('coord-locus-lines-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const text = prose(slide);
      const [, d, lineTex] = /always \$(\d+)\$ from the line \$([^$]+)\$/.exec(text)!;
      const axis = lineTex.includes('x') ? 0 : 1;
      const line = equation(lineTex);
      // The line x = c or y = c, whatever form it was written in.
      const c = axis === 0 ? -line(0, 0) / (line(1, 0) - line(0, 0)) : -line(0, 0) / (line(0, 1) - line(0, 0));
      const holds = (P: P2) => Math.abs(P[axis] - c) === Number(d);
      expect(sameLocus(satisfies(filled(slide)), holds), where).toBe(true);
    }
  });

  /** A and B, and PA = 2PB tested on a point. */
  const ratioCondition = (slide: Slide) => {
    expect(prose(slide)).toContain('$PA = 2PB$');
    const [A, B] = corners(slide, ['A', 'B']);
    return { A, B, holds: (P: P2) => d2(P, A) === 4 * d2(P, B) };
  };

  it('each step of PA = 2PB squared out is right, and the last is the locus', () => {
    for (const { slide, where } of slides('coord-locus-ratio-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const { A, B, holds } = ratioCondition(slide);
      const values = slide.reductions.map((step) => step.value);
      const at = (tex: string, [x, y]: P2) => math.evaluate(toMath(tex), { x, y }) as number;
      for (const P of [[0.3, -1.7], [2.1, 0.4]] as P2[]) {
        expect(at(values[0], P), where).toBeCloseTo(d2(P, A), 9);
        expect(at(values[1], P), where).toBeCloseTo(4 * d2(P, B), 9);
      }
      for (const tex of values.slice(2)) expect(sameLocus(satisfies(tex), holds), `${where}: ${tex}`).toBe(true);
    }
  });

  it('the circle shown is the locus PA = 2PB, and its centre and radius are the ones placed', () => {
    for (const { slide, where } of slides('coord-locus-centre-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const { holds } = ratioCondition(slide);
      const shown = texts(slide).find((tex) => tex.includes('x^2'))!;
      expect(sameLocus(satisfies(shown), holds), where).toBe(true);
      const { a, b, r2 } = circleOf(shown);
      const [x, y, r] = slide.answer.map(Number);
      expect([x, y, r * r], where).toEqual([a, b, r2].map((v) => expect.closeTo(v, 9)));
    }
  });

  it('r^2 is the one the Apollonius circle of A and B has', () => {
    for (const { slide, where } of slides('coord-locus-ratio-r2')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const { A, B } = ratioCondition(slide);
      // PA = kPB is the circle whose radius is k|AB| / (k^2 - 1).
      expect(Number(slide.answer), where).toBeCloseTo((4 * d2(A, B)) / 9, 9);
    }
  });

  it('the centre and r^2 picked make the circle every right angle APB lies on', () => {
    for (const { slide, where } of slides('coord-locus-diameter-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const [A, B] = corners(slide, ['A', 'B']);
      const [, x, y] = /\((-?\d+), (-?\d+)\)/.exec(slide.answer[1])!;
      const r2 = Number(/r\^2 = (\d+)/.exec(slide.answer[2])![1]);
      const onCircle = (P: P2) => d2(P, [Number(x), Number(y)]) === r2;
      expect(slide.answer[0], where).toContain('diameter');
      expect(sameLocus(onCircle, (P) => dot(minus(A, P), minus(B, P)) === 0), where).toBe(true);
    }
  });

  it('exactly the equation marked right is the locus PA perpendicular to PB', () => {
    for (const { slide, where } of slides('coord-locus-perp-choice')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const [A, B] = corners(slide, ['A', 'B']);
      const right = (P: P2) => dot(minus(A, P), minus(B, P)) === 0;
      for (const option of slide.options) {
        expect(sameLocus(satisfies(option.label), right), `${where}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });
});
