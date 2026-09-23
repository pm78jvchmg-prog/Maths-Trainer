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
