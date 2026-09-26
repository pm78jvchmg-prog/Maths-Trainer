/**
 * The Forces and Newton's Laws generators, checked against the mechanics.
 *
 * The generic sweep in `generators.test.ts` proves each slide agrees with
 * itself: the bank holds the answer, the checker accepts it. It would pass a
 * weight resolved with the sine where the cosine belongs, a pulley with the
 * masses the wrong way round, or a lift that feels heavier while slowing on the
 * way up. So here every answer is read back off the rendered slide — the value
 * typed, the tiles placed, the tree or table filled, the option marked correct,
 * the flow's path, the last value of a line of working — and compared with the
 * physics worked out afresh: angles through `Math.atan2`, sizes through
 * `Math.hypot`, and F = ma written out rather than borrowed. None of the
 * generator's own force arithmetic is used to decide what is right.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import { reduce, startSession, type Answer, type Session } from '../../engine/session';
import { headsClash, toggleForce, type Direction } from '../forces';
import { registry } from '../registry';
import type { Generator, Lesson, Slide } from '../types';
import { forcesByName as g, type Angle } from './forces';

const SEEDS = 120;
const TIME = { timeout: 120_000 };
const GRAV = 9.8;

function draws<P>(generator: Generator<P>, seeds = SEEDS): { params: P; slide: Slide; seed: number; difficulty: number }[] {
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: seeds }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { params, slide: generator.render(params), seed, difficulty };
    }),
  );
}

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

function expectClose(got: number[], want: number[], where: string): void {
  expect(got.length, where).toBe(want.length);
  got.forEach((v, i) => expect(close(v, want[i]), `${where}: slot ${i} is ${v}, expected ${want[i]}`).toBe(true));
}

/** A tile or bank token as a number: `- 3`, `+ 4.5`, `12`. */
const token = (s: string): number => {
  const n = Number(s.replace(/[\s+]/g, ''));
  if (!Number.isFinite(n)) throw new Error(`not a number: ${s}`);
  return n;
};

/** The numbers a slide's answer holds, in order. */
function answerOf(slide: Slide): number[] {
  switch (slide.kind) {
    case 'expression':
      return [Number(math.evaluate(slide.answer))];
    case 'slider':
      return [slide.answer];
    case 'tiles':
    case 'tree':
    case 'table':
      return slide.answer.map(token);
    case 'steps':
      return [token(slide.reductions[slide.reductions.length - 1].value)];
    case 'choice': {
      const label = slide.options.find((o) => o.id === slide.correctId)!.label;
      return [Number(/^-?[\d.]+/.exec(label)![0])];
    }
    default:
      throw new Error(`no numeric answer on a ${slide.kind} slide`);
  }
}

/** The angle a triangle-backed Angle stands for, in radians. */
const rad = (t: Angle) => Math.atan2(t.o, t.a);

/** The prose of a slide's prompt, joined. */
const promptText = (slide: Slide) =>
  slide.kind === 'teach' ? '' : slide.prompt.map((b) => (b.kind === 'prose' ? b.text : '')).join(' ');

/** A value quoted in the prompt as `$<n>\text{ N}$` after the given words. */
function quoted(slide: Slide, before: string): number {
  const text = promptText(slide);
  const at = text.indexOf(before);
  if (at < 0) throw new Error(`"${before}" not in: ${text}`);
  return Number(/\$(-?[\d.]+)\\text\{ N\}\$/.exec(text.slice(at))![1]);
}

/** Every derived multiple-choice option marked correct holds the typed answer. */
function choicesAgree<P>(generator: Generator<P>): void {
  for (const { params, slide } of draws(generator, 60)) {
    const typed = answerOf(slide)[0];
    const right = generator.choices!(params).filter((o) => o.correct);
    expect(right).toHaveLength(1);
    expect(close(Number(right[0].answer), typed)).toBe(true);
  }
}

describe('forces as vectors', TIME, () => {
  it('magnitude is Pythagoras, run either way', () => {
    for (const { params, slide } of draws(g.magnitude)) {
      const { a, b, r, find } = params;
      expect(a * a + b * b).toBe(r * r);
      expectClose(answerOf(slide), [find === 'r' ? Math.hypot(a, b) : a], 'magnitude');
    }
    choicesAgree(g.magnitude);
  });

  it('i, j tiles read the drawn arrow from tail to head', () => {
    for (const { params, slide } of draws(g.ijTiles)) {
      expectClose(answerOf(slide), [params.a, params.b], 'ij');
    }
  });

  it('the direction is the angle with i', () => {
    for (const { params, slide } of draws(g.direction)) {
      const deg = (Math.abs(Math.atan2(params.b, params.a)) * 180) / Math.PI;
      expect(answerOf(slide)[0]).toBe(Math.round(deg * 10) / 10);
    }
  });

  it('a component slider lands on the component', () => {
    for (const { params, slide } of draws(g.componentSlider)) {
      const { x, y, ask, mag } = params;
      if (mag > 0) expect(close(Math.hypot(x, y), mag)).toBe(true);
      expectClose(answerOf(slide), [ask === 'i' ? x : y], 'component');
    }
  });

  it('a force of given size along a vector has that size and that direction', () => {
    for (const { params, slide } of draws(g.fromMagnitude)) {
      const [x, y] = answerOf(slide);
      const { u, v, h, k } = params;
      expect(close(Math.hypot(x, y), k * h)).toBe(true);
      expect(close(x * v, y * u)).toBe(true);
      expect(Math.sign(x)).toBe(Math.sign(u));
    }
  });
});

describe('resultants', TIME, () => {
  const total = (forces: [number, number][]) => forces.reduce<[number, number]>(([x, y], [a, b]) => [x + a, y + b], [0, 0]);

  it('tiles add the forces', () => {
    for (const { params, slide } of draws(g.resultantTiles)) expectClose(answerOf(slide), total(params.forces), 'resultant');
  });

  it('the tree ends on the resultant\'s magnitude', () => {
    for (const { params, slide } of draws(g.resultantTree)) {
      const [x, y] = total(params.forces);
      expectClose(answerOf(slide), [x, y, Math.hypot(x, y)], 'resultant tree');
    }
  });

  it('the missing component makes the resultant point the stated way', () => {
    for (const { params, slide } of draws(g.parallel)) {
      const k = answerOf(slide)[0];
      const { f1, f2, known, target } = params;
      const third: [number, number] = target === 'i' ? [known, k] : [k, known];
      const [x, y] = total([f1, f2, third]);
      if (target === 'i') expect(close(y, 0)).toBe(true);
      else if (target === 'j') expect(close(x, 0)).toBe(true);
      else expect(close(x * target[1], y * target[0])).toBe(true);
    }
    choicesAgree(g.parallel);
  });

  it('the resultant slider lands on the summed component', () => {
    for (const { params, slide } of draws(g.resultantSlider)) {
      const [x, y] = total(params.forces);
      expectClose(answerOf(slide), [params.ask === 'i' ? x : y], 'resultant slider');
    }
  });

  it('forces at right angles meet the resultant through Pythagoras', () => {
    for (const { params, slide } of draws(g.perpendicular)) {
      const { p, q, r, find } = params;
      expectClose(answerOf(slide), [find === 'r' ? Math.hypot(p, q) : Math.sqrt(r * r - p * p)], 'perpendicular');
      expect(close(Math.hypot(p, q), r)).toBe(true);
    }
    choicesAgree(g.perpendicular);
  });
});

describe('resolving', TIME, () => {
  it('resolves across and up, with the angle from either axis', () => {
    for (const { params, slide } of draws(g.resolveTiles)) {
      const { F, t, fromVertical } = params;
      const from = fromVertical ? Math.PI / 2 - rad(t) : rad(t);
      expectClose(answerOf(slide), [F * Math.cos(from), F * Math.sin(from)], 'resolve');
    }
  });

  it('names the right trig function for each component', () => {
    const cosine = new Set(['hh', 'vv', 'wInto', 'ropeAlong', 'pushAlong']);
    for (const { params, slide } of draws(g.whichTrig)) {
      if (slide.kind !== 'choice') throw new Error('expected a choice');
      const label = slide.options.find((o) => o.id === slide.correctId)!.label;
      expect(label, params.scene).toBe(`${params.P}\\${cosine.has(params.scene) ? 'cos' : 'sin'}${params.sym}`);
    }
  });

  it('the table resolves each force and adds the columns', () => {
    for (const { params, slide } of draws(g.resolveTable)) {
      const parts = params.angled.map(({ F, t, sx, sy }) => [sx * F * Math.cos(rad(t)), sy * F * Math.sin(rad(t))]);
      const tx = parts.reduce((s, [x]) => s + x, params.axis[0]);
      const ty = parts.reduce((s, [, y]) => s + y, params.axis[1]);
      expectClose(answerOf(slide), [...parts.flat(), tx, ty], 'resolve table');
    }
  });

  it('the net force is what the line of working evaluates to', () => {
    for (const { params, slide } of draws(g.netSteps)) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const { T, t, Q, U, u } = params;
      const want = T * Math.cos(rad(t)) - (U === 0 ? Q : U * Math.cos(rad(u)));
      const line = Number(math.evaluate(slide.start.join(' ').replace(/\\times/g, '*')));
      expectClose(answerOf(slide), [want], 'net');
      expect(close(line, want)).toBe(true);
    }
  });
});

describe('equilibrium and friction', TIME, () => {
  it('weight is 9.8 times the mass', () => {
    for (const { params, slide } of draws(g.weight)) {
      expectClose(answerOf(slide), [params.find === 'W' ? params.m * GRAV : params.m], 'weight');
    }
    choicesAgree(g.weight);
  });

  it('the normal reaction takes the vertical part of a pull off the weight, or adds a push', () => {
    for (const { params, slide } of draws(g.normalTree)) {
      const { m, P, t, push } = params;
      const W = m * GRAV;
      const V = P * Math.sin(rad(t));
      expectClose(answerOf(slide), [W, V, push ? W + V : W - V], 'normal');
    }
  });

  it('the flow says equilibrium exactly when both sums vanish', () => {
    for (const { params, slide } of draws(g.equilibriumFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const x = params.forces.reduce((s, [a]) => s + a, 0);
      const y = params.forces.reduce((s, [, b]) => s + b, 0);
      expect(slide.answer).toEqual(x !== 0 ? ['No'] : y !== 0 ? ['Yes', 'No'] : ['Yes', 'Yes']);
    }
  });

  it('the missing force brings the total, weight included, to zero', () => {
    for (const { params, slide } of draws(g.equilibriumTiles)) {
      const [a, b] = answerOf(slide);
      const x = params.forces.reduce((s, [p]) => s + p, a);
      const y = params.forces.reduce((s, [, q]) => s + q, b) - params.m * GRAV;
      expect(close(x, 0) && close(y, 0)).toBe(true);
    }
  });

  it('a hanging particle: T cos a holds the weight, T sin a balances P', () => {
    for (const { params, slide } of draws(g.hanging)) {
      const { m, t, find } = params;
      const T = (m * GRAV) / Math.cos(rad(t));
      expectClose(answerOf(slide), [find === 'T' ? T : T * Math.sin(rad(t))], 'hanging');
    }
    choicesAgree(g.hanging);
  });

  it('the weight splits into mg sin a down the slope and mg cos a into it', () => {
    for (const { params, slide } of draws(g.slopeTiles)) {
      const W = params.m * GRAV;
      expectClose(answerOf(slide), [W * Math.sin(rad(params.t)), W * Math.cos(rad(params.t))], 'slope tiles');
    }
  });

  it('holding a particle on a smooth slope, along it or horizontally', () => {
    for (const { params, slide } of draws(g.slopeHold)) {
      const { m, t, pull, find } = params;
      const W = m * GRAV;
      const want =
        pull === 'along'
          ? { P: W * Math.sin(rad(t)), R: W * Math.cos(rad(t)) }
          : { P: W * Math.tan(rad(t)), R: W / Math.cos(rad(t)) };
      expectClose(answerOf(slide), [want[find]], 'hold');
    }
    choicesAgree(g.slopeHold);
  });

  const friction = ({ m, mu, P, t }: { m: number; mu: number; P: number; t?: Angle }) => {
    const R = m * GRAV - (t ? P * Math.sin(rad(t)) : 0);
    const push = t ? P * Math.cos(rad(t)) : P;
    return { R, max: mu * R, push };
  };

  it('friction flow: the greatest friction, then the comparison', () => {
    for (const { params, slide } of draws(g.frictionFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const { max, push } = friction(params);
      const cmp = close(push, max) ? 'They are equal' : push > max ? 'It is bigger' : 'It is smaller';
      expect(token(slide.answer[0].replace(/\$/g, ''))).toSatisfy((v: number) => close(v, max));
      expect(slide.answer[1]).toBe(cmp);
    }
  });

  it('friction tree: R, mu R, then the friction that acts, never more than mu R', () => {
    for (const { params, slide } of draws(g.frictionTree)) {
      const { R, max, push } = friction(params);
      expectClose(answerOf(slide), [R, max, Math.min(push, max)], 'friction tree');
    }
  });

  it('limiting equilibrium on a slope, for P or for mu', () => {
    for (const { params, slide } of draws(g.limitingSlope)) {
      const { m, mu, t, mode } = params;
      const W = m * GRAV;
      const [s, c] = [Math.sin(rad(t)), Math.cos(rad(t))];
      if (mode === 'mu') {
        const P = quoted(slide, 'A force of');
        expectClose(answerOf(slide), [(W * s - P) / (W * c)], 'mu');
      } else {
        expectClose(answerOf(slide), [W * s + (mode === 'up' ? 1 : -1) * mu * W * c], 'limiting');
      }
    }
  });
});

describe("Newton's second law", TIME, () => {
  it('F = ma, with a resistance or a lifting rope', () => {
    for (const { params, slide } of draws(g.fma)) {
      const { kind, m, a, R } = params;
      const push = m * a + R;
      const want = { a, F: m * a, m, Pa: a, P: push, R, T: m * (a + GRAV) }[kind];
      expectClose(answerOf(slide), [want], `fma ${kind}`);
      if (kind === 'Pa') expect(close((quoted(slide, 'horizontal force of') - R) / m, a)).toBe(true);
    }
    choicesAgree(g.fma);
  });

  it('the resistance tree: total resistance, resultant, acceleration', () => {
    for (const { params, slide } of draws(g.resistanceTree)) {
      const { m, a, r1, r2 } = params;
      expectClose(answerOf(slide), [r1 + r2, m * a, a], 'resistance');
    }
  });

  it('the F = ma slider lands on the acceleration', () => {
    for (const { params, slide } of draws(g.fmaSlider)) {
      expectClose(answerOf(slide), [params.a], 'fma slider');
    }
  });

  it('F = ma with vectors divides the summed force by the mass', () => {
    for (const { params, slide } of draws(g.fmaIj)) {
      const [x, y] = answerOf(slide);
      expect(close(x * params.m, params.m * params.a[0]) && close(y * params.m, params.m * params.a[1])).toBe(true);
    }
  });

  it("the first law: zero resultant keeps the motion, otherwise it accelerates the resultant's way", () => {
    for (const { params, slide } of draws(g.newton1Flow)) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const { D, R, v, forces, vel } = params;
      if (forces) {
        const zero = forces.reduce((s, [a]) => s + a, 0) === 0 && forces.reduce((s, [, b]) => s + b, 0) === 0;
        const moving = vel![0] !== 0 || vel![1] !== 0;
        expect(slide.answer).toEqual(zero ? ['Yes', moving ? 'Yes' : 'No'] : ['No', 'The way the resultant points']);
      } else {
        expect(slide.answer).toEqual(D === R ? ['Yes', v > 0 ? 'Yes' : 'No'] : ['No', D > R ? 'Forwards' : 'Backwards']);
      }
    }
  });
});

describe('connected particles', TIME, () => {
  it('towing: the whole system, then the trailer alone', () => {
    for (const { params, slide } of draws(g.towingTree)) {
      const { M, m, a, rc, rt } = params;
      const D = quoted(slide, 'The driving force is');
      const acc = (D - rc - rt) / (M + m);
      expectClose(answerOf(slide), [D - rc - rt, acc, m * acc + rt], 'towing');
      expect(close(acc, a)).toBe(true);
    }
  });

  it('a pulley: acceleration and tension from each particle\'s equation', () => {
    for (const { params, slide } of draws(g.pulley)) {
      const { m1, m2, setup, mu, find } = params;
      const a = setup === 'hang' ? (GRAV * (m1 - m2)) / (m1 + m2) : (GRAV * (m2 - mu * m1)) / (m1 + m2);
      // Found from the particle the answer did not use: B going up, or B falling.
      const T = setup === 'hang' ? m2 * (GRAV + a) : m2 * (GRAV - a);
      expect(a).toBeGreaterThan(0);
      expectClose(answerOf(slide), [find === 'a' ? a : T], 'pulley');
    }
    choicesAgree(g.pulley);
  });

  it('pulley tiles fill each particle\'s equation of motion', () => {
    for (const { params, slide } of draws(g.pulleyTiles)) {
      const { m1, m2, setup, mu } = params;
      expectClose(answerOf(slide), [setup === 'hang' ? m1 * GRAV : mu * m1 * GRAV, m1, m2 * GRAV, m2], 'pulley tiles');
    }
  });

  it('the tow bar working evaluates to the force', () => {
    for (const { params, slide } of draws(g.towBarSteps)) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const { M, m, a, r } = params;
      const want = (M + m) * a + r;
      const line = Number(math.evaluate(slide.start.join(' ').replace(/\\times/g, '*')));
      expectClose(answerOf(slide), [want], 'tow bar');
      expect(close(line, want)).toBe(true);
    }
  });
});

describe('motion on a slope', TIME, () => {
  const along = ({ m, t, mu, P }: { m: number; t: Angle; mu: number; P: number }) => {
    const W = m * GRAV;
    const F = mu * W * Math.cos(rad(t));
    return P === 0 ? W * Math.sin(rad(t)) - F : P - W * Math.sin(rad(t)) - F;
  };

  it('the acceleration down a slope, or up it under a pull', () => {
    for (const { params, slide } of draws(g.slopeAccel)) {
      expectClose(answerOf(slide), [along(params) / params.m], 'slope accel');
      if (params.P > 0) expect(close(quoted(slide, 'by a force of'), params.P)).toBe(true);
    }
    choicesAgree(g.slopeAccel);
  });

  it('the slope tree: R, friction, resultant, acceleration', () => {
    for (const { params, slide } of draws(g.slopeTree)) {
      const { m, t, mu } = params;
      const R = m * GRAV * Math.cos(rad(t));
      expectClose(answerOf(slide), [R, mu * R, along(params), along(params) / m], 'slope tree');
    }
  });

  it('the slope flow compares the push along the slope with mu R', () => {
    for (const { params, slide } of draws(g.slopeFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const { m, t, mu, P } = params;
      const down = m * GRAV * Math.sin(rad(t));
      const push = Math.abs(P - down);
      const max = mu * m * GRAV * Math.cos(rad(t));
      const cmp = close(push, max) ? 'They are equal' : push > max ? 'It is bigger' : 'It is smaller';
      const want = [...(P > 0 ? [P > down ? 'Up the slope' : 'Down the slope'] : []), cmp];
      const got = slide.answer.filter((s) => !s.startsWith('$'));
      expect(got).toEqual(want);
      expect(close(token(slide.answer.find((s) => s.startsWith('$'))!.replace(/\$/g, '')), max)).toBe(true);
    }
  });

  it('the slope slider lands on g(sin a -/+ mu cos a)', () => {
    for (const { params, slide } of draws(g.slopeSlider)) {
      const { t, dir, parts } = params;
      const mu = parts / (t.o === 3 ? 8 : 6);
      const want = GRAV * (Math.sin(rad(t)) + (dir === 'up' ? 1 : -1) * mu * Math.cos(rad(t)));
      expectClose(answerOf(slide), [want], 'slope slider');
      if (slide.kind !== 'slider') throw new Error('expected a slider');
      expect(want).toBeGreaterThan(0);
      expect(want).toBeLessThanOrEqual(slide.max);
    }
  });
});

describe("Newton's third law", TIME, () => {
  it('a third-law pair is only a pair when all three tests pass', () => {
    for (const { params, slide } of draws(g.pairFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      expect(slide.answer).toEqual({ pair: ['Yes', 'Yes', 'Yes'], same: ['No'], kind: ['Yes', 'No'] }[params.verdict]);
    }
  });

  it('never offers a force on the same object as the partner', () => {
    for (const { slide } of draws(g.pairChoice)) {
      if (slide.kind !== 'choice') throw new Error('expected a choice');
      const text = promptText(slide);
      const right = slide.options.find((o) => o.id === slide.correctId)!.label;
      // The given force acts "on X"; its partner acts on something else.
      const on = / on (the [a-z ]+?)[,.]/.exec(text)?.[1];
      if (on) expect(right.includes(` on ${on}`), `${right} / ${text}`).toBe(false);
    }
  });

  const contact = ({ m1, m2, a, r1, r2 }: { m1: number; m2: number; a: number; r1: number; r2: number }) => {
    const P = (m1 + m2) * a + r1 + r2;
    // From A's side: the push, less A's resistance, less what A spends accelerating itself.
    return { a: (P - r1 - r2) / (m1 + m2), R: P - r1 - m1 * a };
  };

  it('two boxes: the acceleration, then the force each way between them', () => {
    for (const { params, slide } of draws(g.pushTree)) {
      const { a, R } = contact(params);
      expectClose(answerOf(slide), [a, R, R], 'push');
    }
  });

  it('the contact force from A\'s side matches B\'s F = ma', () => {
    for (const { params, slide } of draws(g.contact)) {
      expectClose(answerOf(slide), [contact(params).R], 'contact');
    }
    choicesAgree(g.contact);
  });
});

describe('lifts', TIME, () => {
  /** Up positive, from the words: speeding up keeps the way it moves, slowing down reverses it. */
  const signOf = (words: string) => {
    if (/steady|still/.test(words)) return 0;
    const up = /moving upwards/.test(words);
    return (up ? 1 : -1) * (/speeding up/.test(words) ? 1 : -1);
  };

  it('the reaction on a passenger, or the acceleration from the reading', () => {
    for (const { params, slide } of draws(g.lift)) {
      const { m, a, find, motion } = params;
      // The acceleration form quotes only the reading, so there are no words to check.
      if (find === 'a') expect(close(quoted(slide, 'The scales read'), m * (GRAV + a))).toBe(true);
      else if (motion >= 0) expect(Math.sign(a)).toBe(signOf(promptText(slide)));
      else expect(promptText(slide)).toContain(a > 0 ? 'accelerating upwards' : 'accelerating downwards');
      expectClose(answerOf(slide), [find === 'R' ? m * (GRAV + a) : a], 'lift');
    }
    choicesAgree(g.lift);
  });

  it('the lift flow reads the acceleration off the words', () => {
    for (const { params, slide } of draws(g.liftFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const sign = signOf(promptText(slide).split('.')[0]);
      const acc = sign > 0 ? 'Upwards' : sign < 0 ? 'Downwards' : 'Not accelerating';
      const cmp = sign > 0 ? 'More than their weight' : sign < 0 ? 'Less than their weight' : 'Equal to their weight';
      const R = params.m * (GRAV + sign * params.size);
      expect(slide.answer.slice(0, 2)).toEqual([acc, cmp]);
      if (params.hard) expect(close(token(slide.answer[2].replace(/\$/g, '')), R)).toBe(true);
    }
  });

  it('the lift table: speeding up and slowing down pull opposite ways', () => {
    for (const { params, slide } of draws(g.liftTable)) {
      const { m, a1, a3, down, hard } = params;
      const stages = down ? [-a1, 0, a3] : [a1, 0, -a3];
      const Rs = stages.map((a) => m * (GRAV + a));
      expectClose(answerOf(slide), hard ? stages.flatMap((a, i) => [a, Rs[i]]) : Rs, 'lift table');
    }
  });

  it('the scales slider lands on m(g + a)', () => {
    for (const { params, slide } of draws(g.liftSlider)) {
      expectClose(answerOf(slide), [params.m * (GRAV + params.a)], 'lift slider');
    }
  });

  it('the cable holds lift and passenger; the floor holds the passenger', () => {
    for (const { params, slide } of draws(g.cableTree)) {
      const { M, m, a, motion } = params;
      if (motion >= 0) expect(Math.sign(a)).toBe(signOf(promptText(slide)));
      expectClose(answerOf(slide), [GRAV + a, (M + m) * (GRAV + a), m * (GRAV + a)], 'cable');
    }
  });
});

/*
 * Level 3: connected particles on slopes. Every rig is worked out again here
 * from its masses, angles and coefficients, with the angle through
 * `Math.atan2` and the direction of motion decided afresh, never by asking
 * `rigMotion`. The two free-body diagrams are graded end to end, through
 * `toggleForce`, `startSession` and `submit`, as forceDiagram.test.ts does.
 */
interface Face {
  o: number;
  a: number;
}

interface HandRig {
  m1: number;
  m2: number;
  t1: Face;
  mu1: number;
  t2: Face;
  mu2: number;
}

/** Pulls, reactions, the most friction can give, which way, a and T. */
function byHand({ m1, m2, t1, mu1, t2, mu2 }: HandRig) {
  const th1 = Math.atan2(t1.o, t1.a);
  const th2 = Math.atan2(t2.o, t2.a);
  const pullA = m1 * GRAV * Math.sin(th1);
  const pullB = m2 * GRAV * Math.sin(th2);
  const RA = m1 * GRAV * Math.cos(th1);
  const RB = Math.abs(m2 * GRAV * Math.cos(th2)) < 1e-9 ? 0 : m2 * GRAV * Math.cos(th2);
  const FA = mu1 * RA;
  const FB = mu2 * RB;
  const diff = pullB - pullA;
  const moves = Math.abs(diff) > FA + FB + 1e-9;
  const falls: 'A' | 'B' | 'none' = !moves ? 'none' : diff > 0 ? 'B' : 'A';
  // Whole system along the string, then the particle going up alone.
  const a = moves ? (Math.abs(diff) - FA - FB) / (m1 + m2) : 0;
  const T = falls === 'B' ? pullB - FB - m2 * a : falls === 'A' ? pullA - FA - m1 * a : NaN;
  return { th1, pullA, pullB, RA, RB, FA, FB, diff, falls, a, T };
}

type ForcesSlide = Extract<Slide, { kind: 'forces' }>;

function lessonOf(generatorId: string, difficulty: number): Lesson {
  return { id: `test-${generatorId}-${difficulty}`, title: 'Connected', slides: [], skillCheck: [{ type: 'generated', generatorId, difficulty }] };
}

const submitted = (session: Session, draft: Answer): string => reduce(session, { type: 'submit', answer: draft }).feedback.kind;
const tapped = (ids: readonly string[]) => ids.reduce((draft, id) => toggleForce(draft, id as Direction), '');

/** The flow's path with every `$...$` number read back as a number, labels left as words. */
const pathOf = (slide: Slide): (number | string)[] => {
  if (slide.kind !== 'flow') throw new Error(`expected a flow, got ${slide.kind}`);
  return slide.answer.map((label) => (/^\$-?[\d.]+\$$/.test(label) ? Number(label.slice(1, -1)) : label));
};

function expectPath(got: (number | string)[], want: (number | string)[], where: string): void {
  expect(got.length, where).toBe(want.length);
  got.forEach((v, i) => {
    const w = want[i];
    if (typeof w === 'number') expect(typeof v === 'number' && close(v, w), `${where}: step ${i} is ${v}, expected ${w}`).toBe(true);
    else expect(v, `${where}: step ${i}`).toBe(w);
  });
}

/** A steps line read as arithmetic, to prove it evaluates to its last value. */
const lineValue = (tokens: string[]): number => Number(math.evaluate(tokens.join(' ').replace(/\\times/g, '*').replace(/\\div/g, '/')));

describe('connected particles on slopes', TIME, () => {
  it('the acceleration and the tension, a slope with B hanging', () => {
    for (const { params, slide } of draws(g.incline)) {
      const h = byHand(params.rig);
      expect(h.falls).not.toBe('none');
      expectClose(answerOf(slide), [params.find === 'a' ? h.a : h.T], 'incline');
      // Whole or a tenth, as the level promises.
      expect(close(answerOf(slide)[0] * 10, Math.round(answerOf(slide)[0] * 10))).toBe(true);
    }
    choicesAgree(g.incline);
  });

  it('both equations of motion, whose sum gives the acceleration', () => {
    for (const gen of [g.inclineTiles, g.pegTiles]) {
      for (const { params, slide } of draws(gen)) {
        if (slide.kind !== 'tiles') throw new Error('expected tiles');
        const h = byHand(params.rig);
        const { m1, m2 } = params.rig;
        const want =
          h.falls === 'B'
            ? [h.pullA, h.FA, m1, h.pullB, h.FB, m2]
            : [h.pullA, h.FA, m1, h.pullB, h.FB, m2];
        expectClose(answerOf(slide), want.filter((v, i) => i === 2 || i === 5 || v > 1e-9), 'tiles');
        // The template names the way it moves: the falling particle's weight comes first.
        expect(slide.template).toContain(h.falls === 'B' ? 'B: \\; {' : 'A: \\; {0} - T');
        expect(close((Math.abs(h.diff) - h.FA - h.FB) / (m1 + m2), h.a)).toBe(true);
      }
    }
  });

  it('the system tree: the resultant along the string, a, then T', () => {
    for (const { params, slide } of draws(g.inclineSystemTree)) {
      const h = byHand(params.rig);
      const net = Math.abs(h.diff) - h.FA;
      expectClose(answerOf(slide), params.rig.mu1 > 0 ? [h.RA, h.FA, net, h.a, h.T] : [net, h.a, h.T], 'system tree');
    }
  });

  it('which way it goes, and with friction whether it goes', () => {
    for (const { params, slide } of draws(g.inclineWay)) {
      const h = byHand(params.rig);
      const cmp = Math.abs(h.diff) < 1e-9 ? 'They are equal' : h.diff > 0 ? "$B$'s weight is bigger" : "$B$'s weight is smaller";
      const rough = params.rig.mu1 > 0 && Math.abs(h.diff) > 1e-9;
      expectPath(pathOf(slide), [h.pullA, cmp, ...(rough ? [h.FA, h.falls === 'none' ? 'No, it is not' : 'Yes, it is bigger'] : [])], 'way');
    }
  });

  it('the balancing mass sits where the pulls meet, or at the edge of what friction holds', () => {
    for (const { params, slide } of draws(g.inclineBalance)) {
      const th = Math.atan2(params.t.o, params.t.a);
      const spread = params.ask === 'balance' ? 0 : (params.ask === 'most' ? 1 : -1) * params.mu * Math.cos(th);
      const mB = params.m1 * (Math.sin(th) + spread);
      expectClose(answerOf(slide), [mB], 'balance');
      // At that mass the system is on the point of moving: a little more (or less) and it goes.
      const rig = { m1: params.m1, m2: mB, t1: params.t, mu1: params.mu, t2: { o: 1, a: 0 }, mu2: 0 };
      expect(byHand(rig).falls).toBe('none');
      const nudge = params.ask === 'least' ? -0.01 : 0.01;
      if (params.ask !== 'balance') expect(byHand({ ...rig, m2: mB + nudge }).falls).not.toBe('none');
    }
  });

  it('the friction holding a system at rest is the difference between the pulls', () => {
    for (const { params, slide } of draws(g.inclineRestSteps)) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const h = byHand(params.rig);
      expect(h.falls).toBe('none');
      expectClose(answerOf(slide), [Math.abs(h.diff)], 'rest friction');
      expect(close(lineValue(slide.start), Math.abs(h.diff))).toBe(true);
      expect(Math.abs(h.diff)).toBeLessThanOrEqual(h.FA + 1e-9);
    }
  });

  it('the peg table: each particle resolved on its own face', () => {
    for (const { params, slide } of draws(g.pegTable)) {
      if (slide.kind !== 'table') throw new Error('expected a table');
      const h = byHand(params.rig);
      const cells = [
        [h.pullA, h.RA, h.FA],
        [h.pullB, h.RB, h.FB],
      ];
      const got = slide.rows.map((row) => row.slice(1));
      const answers = answerOf(slide);
      let k = 0;
      got.forEach((row, r) =>
        row.forEach((cell, c) => {
          const v = cell === null ? answers[k++] : token(cell);
          expect(close(v, cells[r][c]), `row ${r} col ${c}: ${v} vs ${cells[r][c]}`).toBe(true);
        }),
      );
    }
  });

  it('over a peg: the acceleration and the tension', () => {
    for (const { params, slide } of draws(g.peg)) {
      const h = byHand(params.rig);
      expect(h.falls).not.toBe('none');
      expectClose(answerOf(slide), [params.find === 'a' ? h.a : h.T], 'peg');
    }
    choicesAgree(g.peg);
  });

  it('over a peg: which way, both frictions, and whether they hold', () => {
    for (const { params, slide } of draws(g.pegFlow)) {
      const h = byHand(params.rig);
      const way = h.diff > 0 ? '$B$ down its slope' : params.rig.t1.o === 0 ? '$A$ off the table' : '$A$ down its slope';
      expectPath(pathOf(slide), [way, h.FA + h.FB, h.falls === 'none' ? 'No, it is not' : 'Yes, it is bigger'], 'peg flow');
    }
  });

  /** Taut from rest through h, then slack: v^2 = 2ah, then s = v^2 / 2d with d from gravity and friction. */
  const slackByHand = ({ rig, h, L }: { rig: HandRig; h: number; L: number }) => {
    const hand = byHand(rig);
    expect(hand.falls).toBe('B');
    const v = Math.sqrt(2 * hand.a * h);
    const d = GRAV * Math.sin(hand.th1) + rig.mu1 * GRAV * Math.cos(hand.th1);
    const s = (v * v) / (2 * d);
    return { a: hand.a, v, d, s, back: rig.t1.o > 0 && Math.tan(hand.th1) > rig.mu1 + 1e-9, reaches: rig.t1.o === 0 && L - h <= s + 1e-9 };
  };

  it('after the string goes slack: the speed, and how much further A goes', () => {
    for (const { params, slide } of draws(g.slackSpeed)) {
      const k = slackByHand(params);
      expectClose(answerOf(slide), [params.find === 'v' ? k.v : k.s], 'slack');
    }
    choicesAgree(g.slackSpeed);
  });

  it('the two stages as a tree', () => {
    for (const { params, slide } of draws(g.slackStagesTree)) {
      const k = slackByHand(params);
      expectClose(answerOf(slide), [k.a, k.v, k.d, k.s], 'slack tree');
    }
  });

  it('the extra distance, worked out on the line', () => {
    for (const { params, slide } of draws(g.slackDistanceSteps)) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const k = slackByHand(params);
      expectClose(answerOf(slide), [k.s], 'slack steps');
      expect(close(lineValue(slide.start), k.s)).toBe(true);
    }
  });

  it('after B lands: the deceleration, the distance, then back down or to the pulley', () => {
    for (const { params, slide } of draws(g.slackFlow)) {
      const k = slackByHand(params);
      const table = params.rig.t1.o === 0;
      const last = table ? (k.reaches ? 'Yes, it reaches it' : 'No, it stops short') : k.back ? 'The pull is bigger' : 'The pull is not bigger';
      expectPath(pathOf(slide), [k.d, k.s, last], 'slack flow');
    }
  });

  it('checks a claimed tension against both particles', () => {
    for (const { params, slide } of draws(g.inclineCheck)) {
      const h = byHand(params.rig);
      const claim = Number(/T = (-?[\d.]+)\\text\{ N\}/.exec(promptText(slide))![1]);
      const want = claim >= h.pullB - 1e-9 ? ['No, it is not'] : claim <= h.pullA + h.FA + 1e-9 ? ['Yes, it is less', 'No, it is not'] : ['Yes, it is less', 'Yes, it is more'];
      expectPath(pathOf(slide), want, 'check');
      // The right tension always passes both checks.
      expect(h.T).toBeLessThan(h.pullB);
      expect(h.T).toBeGreaterThan(h.pullA + h.FA);
      if (params.slip === 'none') expect(close(claim, h.T)).toBe(true);
      else expect(close(claim, h.T)).toBe(false);
    }
  });

  describe.each([1, 2])('the free-body diagrams at difficulty %i', (difficulty) => {
    const sessions = (id: string) =>
      Array.from({ length: SEEDS }, (_, seed) => {
        const session = startSession(lessonOf(id, difficulty), registry, seed);
        const slide = session.skillCheck[0].slide;
        if (slide.kind !== 'forces') throw new Error(`${id} rendered ${slide.kind}`);
        return { session, slide: slide as ForcesSlide, seed };
      });

    it('picks the forces on one particle, whatever the tap order', () => {
      for (const { session, slide, seed } of sessions('force-incline-pick')) {
        if (slide.mode !== 'pick') throw new Error('expected pick');
        const text = promptText(slide);
        const onB = text.includes('The diagram shows $B$');
        // By hand: B hangs on its string alone; A has its weight, the slope's
        // reaction, the string up the slope, and friction down it unless smooth.
        const want = onB ? ['down', 'up'] : ['down', 'outOfSlope', 'upSlope', ...(text.includes('smooth slope at') ? [] : ['downSlope'])];
        expect(slide.answer.split('|').sort(), `seed ${seed}`).toEqual([...want].sort());
        expect(headsClash(slide.scene, slide.arrows.map((a) => a.id))).toEqual([]);
        expect(submitted(session, tapped(want)), `seed ${seed}`).toBe('correct');
        expect(submitted(session, tapped([...want].reverse())), `seed ${seed}`).toBe('correct');
        for (const wrong of slide.arrows.map((a) => a.id).filter((id) => !want.includes(id))) {
          expect(submitted(session, tapped([...want, wrong])), `seed ${seed}: + ${wrong}`).toBe('incorrect');
        }
        expect(submitted(session, tapped(want.slice(1))), `seed ${seed}`).toBe('incorrect');
        expect(submitted(session, ''), `seed ${seed}`).toBe('incorrect');
      }
    });

    it('fills the forces on A with W, R, T and friction worked out by hand', () => {
      for (const { params, slide, seed } of draws(g.inclineFill).filter((d) => d.difficulty === difficulty)) {
        if (slide.kind !== 'forces' || slide.mode !== 'fill') throw new Error('expected fill');
        const h = byHand(params.rig);
        expect(h.falls).toBe('B');
        const byArrow: Record<string, number> = { down: params.rig.m1 * GRAV, outOfSlope: h.RA, upSlope: h.T, downSlope: h.FA };
        let k = 0;
        for (const arrow of slide.arrows) {
          const v = arrow.given === undefined ? token(slide.answer[k++]) : token(arrow.given);
          expect(close(v, byArrow[arrow.id]), `seed ${seed}: ${arrow.id} is ${v}`).toBe(true);
        }
        expect(slide.scene.surface === 'slope' && Math.abs(slide.scene.angle - (Math.atan2(3, 4) * 180) / Math.PI) < 0.05).toBe(true);
      }
      for (const { session, slide, seed } of sessions('force-incline-fill')) {
        if (slide.mode !== 'fill') throw new Error('expected fill');
        expect(headsClash(slide.scene, slide.arrows.map((a) => a.id))).toEqual([]);
        expect(submitted(session, [...slide.answer]), `seed ${seed}`).toBe('correct');
        for (const [idx, want] of slide.answer.entries()) {
          for (const other of new Set(slide.bank)) {
            if (other === want) continue;
            const draft = [...slide.answer];
            draft[idx] = other;
            expect(submitted(session, draft), `seed ${seed}: blank ${idx} as ${other}`).toBe('incorrect');
          }
        }
      }
    });
  });
});

/*
 * Level 4: moments. Each beam's forces and distances are checked to be the
 * ones the prompt states, then its reactions come from the two equilibrium
 * equations solved afresh: resolving, and moments about A, solved together
 * by Cramer's rule rather than by taking moments about a support as the
 * generator does. A tipping point is checked by putting the person there and
 * finding the far reaction zero, and a little further on negative. The ladder
 * takes its angle off the prompt's sine and cosine, or its tangent, through
 * `Math.atan2`, and balances moments about its foot as a cross product.
 */

/** A number as the prose writes it. */
const txt = (v: number) => String(Number(v.toFixed(6)));

/** The prompt states this many newtons, or metres. */
function states(slide: Slide, v: number, unit: 'N' | 'm', where: string): void {
  expect(promptText(slide), `${where}: ${v} ${unit} not stated`).toContain(`$${txt(v)}\\text{ ${unit}}$`);
}

interface Down {
  x: number;
  w: number;
}

/** Both reactions from resolving and moments about A, solved together. */
function supported(c: number, d: number, down: Down[]): { RC: number; RD: number } {
  const total = down.reduce((s, f) => s + f.w, 0);
  const turn = down.reduce((s, f) => s + f.w * f.x, 0);
  // RC + RD = total, c RC + d RD = turn.
  const det = d - c;
  return { RC: (total * d - turn) / det, RD: (turn - total * c) / det };
}

interface HandBeam {
  L: number;
  W: number;
  c: number;
  d: number;
  loads: { x: number; w: number }[];
}

const downs = (b: HandBeam): Down[] => [{ x: b.L / 2, w: b.W }, ...b.loads.map(({ x, w }) => ({ x, w }))];

function statesBeam(slide: Slide, b: HandBeam, where: string, weighed = true): void {
  states(slide, b.L, 'm', where);
  if (weighed) states(slide, b.W, 'N', where);
  for (const x of [b.c, b.d]) if (x !== 0 && x !== b.L) states(slide, x, 'm', where);
}

/** A beam's reactions by hand, with its weight and loads checked against the prompt. */
function beamByHand(slide: Slide, b: HandBeam, where: string) {
  statesBeam(slide, b, where);
  for (const l of b.loads) states(slide, l.w, 'N', where);
  return supported(b.c, b.d, downs(b));
}

/** The resultant moment about p of vertical forces, clockwise positive: minus the cross product. */
const clockwise = (p: number, forces: { x: number; F: number; up: boolean }[]) =>
  -forces.reduce((s, f) => s + (f.x - p) * (f.up ? f.F : -f.F), 0);

describe('moments', TIME, () => {
  it('the moment of one force: the part at right angles times the distance', () => {
    for (const { params, slide } of draws(g.moment)) {
      const { F, d, t } = params;
      states(slide, F, 'N', 'moment');
      const along = t ? Math.sin(Math.atan2(t.o, t.a)) : 1;
      if (t) expect(promptText(slide)).toContain(`\\sin\\theta = ${txt(t.o / t.h)}$`);
      expectClose(answerOf(slide), [F * along * d], 'moment');
    }
    choicesAgree(g.moment);
  });

  it('the resultant moment about a pivot: its size and its sense', () => {
    for (const { params, slide } of draws(g.momentSense)) {
      if (slide.kind !== 'choice') throw new Error('expected a choice');
      params.forces.forEach((f, i) => expect(promptText(slide)).toContain(`F_{${i + 1}} = ${f.F}\\text{ N}$ ${f.up ? 'upwards' : 'downwards'}`));
      const net = clockwise(params.p, params.forces);
      const label = slide.options.find((o) => o.id === slide.correctId)!.label;
      expect(label).toBe(`${txt(Math.abs(net))}\\text{ N m ${net > 0 ? 'clockwise' : 'anticlockwise'}}`);
      expect(new Set(slide.options.map((o) => o.label)).size).toBe(slide.options.length);
    }
  });

  it('each distance from the pivot, and each moment', () => {
    for (const { params, slide } of draws(g.momentTable)) {
      const want = params.forces.flatMap((f) => {
        const arm = Math.abs(f.x - params.p);
        return params.hard ? [arm, f.F * arm] : [f.F * arm];
      });
      expectClose(answerOf(slide), want, 'moment table');
    }
  });

  it('the resultant moment, worked on the line', () => {
    for (const { params, slide } of draws(g.momentSumSteps)) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const net = Math.abs(clockwise(params.p, params.forces));
      expectClose(answerOf(slide), [net], 'moment steps');
      expect(close(lineValue(slide.start), net)).toBe(true);
    }
  });

  it('a uniform rod: each reaction, and the reactions from the tree', () => {
    for (const { params, slide } of draws(g.rod)) {
      const r = beamByHand(slide, params.beam, 'rod');
      expectClose(answerOf(slide), [r[params.find]], 'rod');
      expect(r.RC).toBeGreaterThan(0);
      expect(r.RD).toBeGreaterThan(0);
    }
    choicesAgree(g.rod);
    for (const { params, slide } of draws(g.rodReactionsTree)) {
      const b = params.beam;
      const r = beamByHand(slide, b, 'rod tree');
      expectClose(answerOf(slide), [b.W * (b.L / 2 - b.c), r.RD, r.RC], 'rod tree');
    }
  });

  it('the moments equation for a rod balances with the reaction worked out by hand', () => {
    for (const { params, slide } of draws(g.rodTiles)) {
      const b = params.beam;
      const r = beamByHand(slide, b, 'rod tiles');
      const [gap, W, arm] = answerOf(slide);
      expect(W).toBe(b.W);
      expect(gap).toBe(b.d - b.c);
      expect(close((params.about === 'C' ? r.RD : r.RC) * gap, W * arm)).toBe(true);
    }
  });

  it('the slider puts D where its reaction is the one stated', () => {
    for (const { params, slide } of draws(g.rodSlider)) {
      const b = params.beam;
      const stated = quoted(slide, 'The reaction at $D$');
      const [D] = answerOf(slide);
      expect(close(supported(b.c, D, downs(b)).RD, stated)).toBe(true);
      // Half a metre either way gives a different reaction, so the answer is the only one.
      for (const other of [D - 0.5, D + 0.5]) expect(close(supported(b.c, other, downs(b)).RD, stated)).toBe(false);
    }
  });

  it('a plank with loads: each reaction', () => {
    for (const { params, slide } of draws(g.plank)) {
      const r = beamByHand(slide, params.beam, 'plank');
      expectClose(answerOf(slide), [r[params.find]], 'plank');
      expect(Math.min(r.RC, r.RD)).toBeGreaterThan(0);
    }
    choicesAgree(g.plank);
  });

  it('the plank table: every moment about C, then R_D and its moment', () => {
    for (const { params, slide } of draws(g.plankTable)) {
      const b = params.beam;
      const r = beamByHand(slide, b, 'plank table');
      const want = downs(b).flatMap((f) => (params.hard ? [f.x - b.c, f.w * (f.x - b.c)] : [f.w * (f.x - b.c)]));
      expectClose(answerOf(slide), [...want, r.RD, r.RD * (b.d - b.c)], 'plank table');
    }
  });

  it('the plank tiles: every weight with its distance from C, balancing R_D', () => {
    for (const { params, slide } of draws(g.plankTiles)) {
      const b = params.beam;
      const r = beamByHand(slide, b, 'plank tiles');
      const [gap, ...pairs] = answerOf(slide);
      expect(gap).toBe(b.d - b.c);
      const terms = Array.from({ length: pairs.length / 2 }, (_, k) => [pairs[2 * k], pairs[2 * k + 1]]);
      const got = terms.map(([w, arm]) => `${w}@${arm}`).sort();
      expect(got).toEqual(downs(b).map((f) => `${f.w}@${f.x - b.c}`).sort());
      expect(close(r.RD * gap, terms.reduce((s, [w, arm]) => s + w * arm, 0))).toBe(true);
    }
  });

  it('from a given reaction: where the person stands, or their weight or mass', () => {
    for (const { params, slide } of draws(g.plankUnknown)) {
      const { L, W, c, d } = params.beam;
      const load = params.beam.loads[0];
      statesBeam(slide, params.beam, 'unknown');
      const R = quoted(slide, `The reaction at $${params.known === 'RC' ? 'C' : 'D'}$`);
      // Resolving and moments about A, with the unknown solved for.
      let want: number;
      if (params.find === 'x') {
        states(slide, load.w, 'N', 'unknown');
        const other = W + load.w - R;
        const [RC, RD] = params.known === 'RC' ? [R, other] : [other, R];
        want = (RC * c + RD * d - (W * L) / 2) / load.w;
      } else {
        states(slide, load.x, 'm', 'unknown');
        const P =
          params.known === 'RC'
            ? ((W * L) / 2 - R * c - (W - R) * d) / (d - load.x)
            : ((W * L) / 2 - (W - R) * c - R * d) / (c - load.x);
        want = params.find === 'w' ? P : P / GRAV;
      }
      expectClose(answerOf(slide), [want], 'unknown');
    }
  });

  interface HandTilt {
    L: number;
    W: number;
    c: number;
    d: number;
    side: 'A' | 'B';
    P: number;
    box: { x: number; w: number } | null;
  }

  /** The reactions with the person (or the end load) standing at x. */
  const tiltAt = (p: HandTilt, x: number, w = p.P) => supported(p.c, p.d, [{ x: p.L / 2, w: p.W }, ...(p.box ? [p.box] : []), { x, w }]);

  /** At x the far reaction is zero, just inside it positive, just beyond it negative. */
  function tipsAt(p: HandTilt, x: number, where: string): void {
    const far = (at: number) => tiltAt(p, at)[p.side === 'B' ? 'RC' : 'RD'];
    const out = p.side === 'B' ? 1 : -1;
    expect(Math.abs(far(x)), `${where}: far reaction at ${x}`).toBeLessThan(1e-7);
    expect(far(x - 0.25 * out), where).toBeGreaterThan(0);
    expect(far(x + 0.25 * out), where).toBeLessThan(0);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(p.L);
  }

  const pivotX = (p: HandTilt) => (p.side === 'B' ? p.d : p.c);

  it('how far the person gets, and the greatest mass at the end', () => {
    for (const { params: p, slide } of draws(g.tilt)) {
      // The plank's length and supports; its weight, or its mass when the load at the end is asked.
      statesBeam(slide, { ...p, loads: [] }, 'tilt', p.find !== 'm');
      const [v] = answerOf(slide);
      if (p.find === 'm') {
        expect(promptText(slide)).toContain(`mass $${txt(p.W)}\\text{ kg}$`);
        // Masses in place of weights: g multiplies every force and cancels.
        const end = p.side === 'B' ? p.L : 0;
        const far = (m: number) => supported(p.c, p.d, [{ x: p.L / 2, w: p.W }, { x: end, w: m }])[p.side === 'B' ? 'RC' : 'RD'];
        expect(Math.abs(far(v))).toBeLessThan(1e-7);
        expect(far(v + 0.5)).toBeLessThan(0);
      } else {
        states(slide, p.P, 'N', 'tilt');
        if (p.box) states(slide, p.box.w, 'N', 'tilt');
        tipsAt(p, p.find === 'x' ? v : pivotX(p) + (p.side === 'B' ? v : -v), 'tilt');
      }
    }
    choicesAgree(g.tilt);
  });

  it('the tilt flow, the slider and the tree agree with the reactions', () => {
    for (const { params: p, slide } of draws(g.tiltFlow)) {
      const [about, zero, e] = pathOf(slide);
      const name = p.side === 'B' ? 'D' : 'C';
      expect([about, zero]).toEqual([`$${name}$`, `$R_{${p.side === 'B' ? 'C' : 'D'}}$`]);
      tipsAt(p, pivotX(p) + (p.side === 'B' ? (e as number) : -(e as number)), 'tilt flow');
    }
    for (const { params: p, slide } of draws(g.tiltSlider)) {
      if (slide.kind !== 'slider') throw new Error('expected a slider');
      tipsAt(p, slide.answer, 'tilt slider');
    }
    for (const { params: p, slide } of draws(g.tippingTree)) {
      const [hold, R, e] = answerOf(slide);
      const at = pivotX(p);
      const x = at + (p.side === 'B' ? e : -e);
      tipsAt(p, x, 'tipping tree');
      expect(close(hold, p.W * Math.abs(at - p.L / 2) + (p.box ? p.box.w * Math.abs(at - p.box.x) : 0))).toBe(true);
      expect(close(R, tiltAt(p, x)[p.side === 'B' ? 'RD' : 'RC'])).toBe(true);
    }
  });

  /** The ladder's angle read off the prompt: its tangent, or its sine and cosine. */
  function ladderAngle(slide: Slide): number {
    const text = promptText(slide);
    const tan = /\\tan\\alpha = \\tfrac\{(\d+)\}\{(\d+)\}/.exec(text);
    if (tan) return Math.atan2(Number(tan[1]), Number(tan[2]));
    const sin = /\\sin\\alpha = ([\d.]+)\$ and \$\\cos\\alpha = ([\d.]+)\$/.exec(text)!;
    return Math.atan2(Number(sin[1]), Number(sin[2]));
  }

  interface HandLadder {
    L: number;
    W: number;
    P: number;
    s: number;
  }

  /** Moments about the foot as cross products, then resolving. */
  function ladderByHand(slide: Slide, p: HandLadder, where: string) {
    const th = ladderAngle(slide);
    states(slide, p.L, 'm', where);
    states(slide, p.W, 'N', where);
    if (p.P > 0) states(slide, p.P, 'N', where);
    const cross = (r: number, fx: number, fy: number) => r * Math.cos(th) * fy - r * Math.sin(th) * fx;
    // The wall pushes B away from it, the weights pull down; about A they sum to zero.
    const weights = cross(p.L / 2, 0, -p.W) + cross(p.s, 0, -p.P);
    const S = -weights / cross(p.L, -1, 0);
    const R = p.W + p.P;
    return { th, S, R, F: S, mu: S / R };
  }

  it('a ladder: the wall, the friction, the ground, the least mu, how far up', () => {
    for (const { params: p, slide } of draws(g.ladder)) {
      if (p.find === 's') {
        const th = ladderAngle(slide);
        const mu = Number(/\$\\mu = ([\d.]+)\$ at the ground/.exec(promptText(slide))![1]);
        const S = mu * (p.W + p.P);
        const s = (S * p.L * Math.sin(th) - p.W * (p.L / 2) * Math.cos(th)) / (p.P * Math.cos(th));
        expectClose(answerOf(slide), [s], 'ladder s');
        continue;
      }
      const h = ladderByHand(slide, p, 'ladder');
      expectClose(answerOf(slide), [{ S: h.S, F: h.F, R: h.R, mu: h.mu }[p.find]], 'ladder');
      expect(h.mu).toBeLessThan(1.5);
    }
    choicesAgree(g.ladder);
  });

  it('the ladder table, tree and flow', () => {
    for (const { params: p, slide } of draws(g.ladderTable)) {
      const h = ladderByHand(slide, p, 'ladder table');
      const rows: [number, number][] = [
        [p.W, (p.L / 2) * Math.cos(h.th)],
        ...(p.P > 0 ? [[p.P, p.s * Math.cos(h.th)] as [number, number]] : []),
      ];
      const want = rows.flatMap(([F, arm]) => (p.hard ? [arm, F * arm] : [F * arm]));
      const top = p.L * Math.sin(h.th);
      expectClose(answerOf(slide), [...want, h.S, ...(p.hard ? [top] : []), h.S * top], 'ladder table');
    }
    for (const { params: p, slide } of draws(g.ladderLimitTree)) {
      const h = ladderByHand(slide, p, 'ladder tree');
      expectClose(answerOf(slide), [h.S * p.L * Math.sin(h.th), h.R, h.S, h.mu], 'ladder tree');
      expect(h.mu).toBeLessThan(1);
    }
    for (const { params: p, slide } of draws(g.ladderFlow)) {
      const h = ladderByHand(slide, p, 'ladder flow');
      expectPath(pathOf(slide), ['About the foot, $A$', h.S, h.mu], 'ladder flow');
    }
  });
});

/* ---------- Level 5: every mass and velocity read off the slide ---------- */

/** The prompt's prose, joined. */
const said = (slide: Slide): string => promptText(slide);

/** The masses stated, in the order they are stated: `$3\text{ kg}$`. */
const massesIn = (slide: Slide): number[] => [...said(slide).matchAll(/\$([\d.]+)\\text\{ kg\}\$/g)].map((m) => Number(m[1]));

/**
 * The velocities along the line, in order, signed from their words: right is
 * positive, as every question says. "are at rest" sets a scene rather than
 * giving one body's velocity, so it is skipped.
 */
const velocitiesIn = (slide: Slide): number[] =>
  [...said(slide).matchAll(/(?<!are )at rest|moving (left|right) at \$([\d.]+)\\text\{ m s\}\^\{-1\}\$/g)].map((m) =>
    m[0].endsWith('at rest') ? 0 : (m[1] === 'left' ? -1 : 1) * Number(m[2]),
  );

/** The first number quoted with a unit, e.g. `\text{ kg m s}^{-1}`, and the direction after it if there is one. */
function quotedWith(slide: Slide, unit: string): number {
  const esc = unit.replace(/[\\{}^]/g, (c) => `\\${c}`);
  const m = new RegExp(`\\$(-?[\\d.]+)${esc}\\$( to the (left|right))?`).exec(said(slide));
  if (!m) throw new Error(`no ${unit} in: ${said(slide)}`);
  return Number(m[1]) * (m[3] === 'left' ? -1 : 1);
}

const KG_MS = '\\text{ kg m s}^{-1}';
const IMPULSE = '\\text{ N s}';
const NEWTONS = '\\text{ N}';
const SECONDS = '\\text{ s}';

/** `3\mathbf{i} - 2\mathbf{j}` as its two components. */
function ijOf(tex: string): [number, number] {
  const s = tex.replace(/\s/g, '');
  const part = (unit: string) => {
    const m = new RegExp(`([+-]?)([\\d.]*)\\\\mathbf\\{${unit}\\}`).exec(s);
    if (!m) return 0;
    return (m[1] === '-' ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2]));
  };
  return [part('i'), part('j')];
}

/** Every bracketed vector quoted with a unit, in order, as `[unit, [x, y]]`. */
const vectorsIn = (slide: Slide): [string, [number, number]][] =>
  [...said(slide).matchAll(/\$\(([^$]*)\)\\text\{ (m s\}\^\{-1\}|N s\}|N\})\$/g)].map((m) => [m[2].replace(/\}.*$/, ''), ijOf(m[1])]);

/** The lead of a typed slide, which names what is asked for. */
const leadOf = (slide: Slide): string => (slide.kind === 'expression' ? slide.lead ?? '' : '');

/** A table's cells, blanks filled from the answer in reading order, as numbers (the name column dropped). */
function filledTable(slide: Slide): number[][] {
  if (slide.kind !== 'table') throw new Error(`expected a table, got ${slide.kind}`);
  const answers = [...slide.answer];
  return slide.rows.map((row) => row.slice(1).map((cell) => Number(cell ?? answers.shift())));
}

/** A tiles equation with its blanks filled and each velocity symbol replaced by a value, as its two sides. */
function tilesSides(slide: Slide, values: Record<string, number>): [number, number] {
  if (slide.kind !== 'tiles') throw new Error(`expected tiles, got ${slide.kind}`);
  let text = slide.template.replace(/\{(\d)\}/g, (_m, i: string) => ` ${slide.answer[Number(i)]} `);
  for (const [symbol, v] of Object.entries(values)) text = text.split(symbol).join(` * (${v})`);
  const [lhs, rhs] = text.split('=');
  return [Number(math.evaluate(lhs)), Number(math.evaluate(rhs))];
}

describe('momentum and impulse', TIME, () => {
  it('momentum is mass times velocity, run either way', () => {
    for (const { slide } of draws(g.momentum)) {
      const [m] = massesIn(slide);
      const [v] = velocitiesIn(slide);
      const lead = leadOf(slide);
      if (lead === 'p =') expectClose(answerOf(slide), [m * v], 'p');
      else if (lead === 'v =') expectClose(answerOf(slide), [quotedWith(slide, KG_MS) / m], 'v');
      else expectClose(answerOf(slide), [quotedWith(slide, KG_MS) / Math.abs(v)], 'm');
    }
    choicesAgree(g.momentum);
  });

  it('a momentum vector is the mass times each component of the velocity', () => {
    for (const { slide } of draws(g.momentumTiles)) {
      const [m] = massesIn(slide);
      const vectors = vectorsIn(slide);
      let v: [number, number];
      if (vectors.length > 0) v = vectors[0][1];
      else {
        const speed = Number(/moves at \$([\d.]+)\\text/.exec(said(slide))![1]);
        const dir = ijOf(/direction of \$([^$]*)\$/.exec(said(slide))![1]);
        v = [(speed * dir[0]) / Math.hypot(...dir), (speed * dir[1]) / Math.hypot(...dir)];
      }
      expectClose(answerOf(slide), [m * v[0], m * v[1]], 'momentum vector');
    }
  });

  it('every row of the momentum table has p = mv', () => {
    for (const { slide } of draws(g.momentumTable)) {
      const rows = filledTable(slide);
      expect(rows).toHaveLength(3);
      for (const [m, v, p] of rows) expect(close(m * v, p), `m ${m} v ${v} p ${p}`).toBe(true);
    }
  });

  it('the momentum slider lands on the velocity that makes up the momentum', () => {
    for (const { slide } of draws(g.momentumSlider)) {
      const total = quotedWith(slide, KG_MS);
      const masses = massesIn(slide);
      const [v] = answerOf(slide);
      if (masses.length === 2) {
        const [vA] = velocitiesIn(slide);
        expect(close(masses[0] * vA + masses[1] * v, total)).toBe(true);
      } else {
        expect(close(masses[0] * v, total)).toBe(true);
      }
    }
  });

  /** A collision read off the slide: masses, then the velocities before and the one known after. */
  const collisionRead = (slide: Slide) => {
    const [mA, mB] = massesIn(slide);
    const [uA, uB, known] = velocitiesIn(slide);
    return { mA, mB, uA, uB, known, before: mA * uA + mB * uB };
  };

  it('total momentum before equals total after, for the velocity asked', () => {
    for (const { slide } of draws(g.collide)) {
      const { mA, mB, uA, uB, known, before } = collisionRead(slide);
      const findB = leadOf(slide) === 'v_{B} =';
      const [vA, vB] = findB ? [known, (before - mA * known) / mB] : [(before - mB * known) / mA, known];
      expectClose(answerOf(slide), [findB ? vB : vA], 'collide');
      // A catches B, they do not pass through each other, and no energy is made.
      expect(uA).toBeGreaterThan(uB);
      expect(vB).toBeGreaterThanOrEqual(vA);
      expect(mA * vA ** 2 + mB * vB ** 2).toBeLessThanOrEqual(mA * uA ** 2 + mB * uB ** 2 + 1e-9);
    }
    choicesAgree(g.collide);
  });

  it('the conservation tiles are true, and the left side is the momentum before', () => {
    for (const { slide } of draws(g.collideTiles)) {
      if (slide.kind !== 'tiles') throw new Error(slide.kind);
      const { mA, mB, known, before } = collisionRead(slide);
      const findB = slide.template.includes('v_{B}');
      const v = findB ? (before - mA * known) / mB : (before - mB * known) / mA;
      const [lhs, rhs] = tilesSides(slide, { [findB ? 'v_{B}' : 'v_{A}']: v });
      expect(close(lhs, before), `left ${lhs}, momentum before ${before}`).toBe(true);
      expect(close(rhs, before), `right ${rhs}, momentum before ${before}`).toBe(true);
    }
  });

  it('the collision tree holds each momentum, the total and the velocity after', () => {
    for (const { slide } of draws(g.collideSumTree)) {
      const { mA, mB, uA, uB, known: vA, before } = collisionRead(slide);
      const qB = before - mA * vA;
      expectClose(answerOf(slide), [mA * uA, mB * uB, mA * vA, before, qB, qB / mB], 'collision tree');
    }
  });

  it('the collision flow says which way A goes', () => {
    for (const { slide } of draws(g.collideFlow)) {
      const { mA, mB, known: vB, before } = collisionRead(slide);
      const qA = before - mB * vB;
      const way = qA > 0 ? 'Carries on to the right' : qA < 0 ? 'Bounces back to the left' : 'It stops';
      expectPath(pathOf(slide), [before, qA, way], 'collision flow');
      expect(Number.isInteger(qA / mA)).toBe(true);
    }
  });

  it('coalescing particles share one velocity', () => {
    for (const { slide } of draws(g.coalesce)) {
      const masses = massesIn(slide);
      const vs = velocitiesIn(slide);
      const lead = leadOf(slide);
      if (lead === 'v =') {
        const [mA, mB] = masses;
        expectClose(answerOf(slide), [(mA * vs[0] + mB * vs[1]) / (mA + mB)], 'common v');
      } else if (lead === 'u_{B} =') {
        const [mA, mB] = masses;
        const [uA, v] = vs;
        expectClose(answerOf(slide), [((mA + mB) * v - mA * uA) / mB], 'u_B');
      } else {
        const [mA] = masses;
        const [uA, uB, v] = vs;
        expectClose(answerOf(slide), [(mA * (uA - v)) / (v - uB)], 'm_B');
      }
    }
    choicesAgree(g.coalesce);
  });

  it('the coalescing steps keep their value at every line and end on the common velocity', () => {
    for (const { slide } of draws(g.jointSteps)) {
      if (slide.kind !== 'steps') throw new Error(slide.kind);
      const [mA, mB] = massesIn(slide);
      const [uA, uB] = velocitiesIn(slide);
      const v = (mA * uA + mB * uB) / (mA + mB);
      let line = slide.start;
      expect(close(lineValue(line), v)).toBe(true);
      for (const step of slide.reductions) {
        line = [...line.slice(0, step.span[0]), step.value, ...line.slice(step.span[1])];
        expect(close(lineValue(line), v), `line ${line.join(' ')} is not ${v}`).toBe(true);
      }
      expect(line).toHaveLength(1);
      expectClose(answerOf(slide), [v], 'joint steps');
    }
  });

  it('pushed apart from rest, the momenta cancel', () => {
    for (const { slide } of draws(g.separateTable)) {
      const [[mA, vA, pA], [mB, vB, pB]] = filledTable(slide);
      expect(close(mA * vA, pA)).toBe(true);
      expect(close(mB * vB, pB)).toBe(true);
      expect(close(pA + pB, 0)).toBe(true);
      expect(vA).toBeLessThan(0);
    }
    for (const { slide } of draws(g.separateFlow)) {
      const [m1, m2] = massesIn(slide);
      const [v2] = velocitiesIn(slide);
      expect(velocitiesIn(slide)).toHaveLength(1);
      expectPath(pathOf(slide), [0, -m2 * v2, (m2 * v2) / m1], 'separate flow');
    }
  });

  it('impulse is the change in momentum, whichever way it is asked', () => {
    for (const { slide } of draws(g.impulse)) {
      const [m] = massesIn(slide);
      const vs = velocitiesIn(slide);
      const lead = leadOf(slide);
      if (lead === '|I| =') expectClose(answerOf(slide), [Math.abs(m * (vs[1] - vs[0]))], 'wall');
      else if (lead === 'I =') expectClose(answerOf(slide), [m * (vs[1] - vs[0])], 'impulse');
      else if (said(slide).includes('bounces straight back')) {
        // Right positive: it arrives at +u and leaves at -s, and the wall pushes it left.
        const J = -quotedWith(slide, IMPULSE);
        const s = -(J / m + vs[0]);
        expectClose(answerOf(slide), [s], 'rebound');
        expect(s).toBeLessThanOrEqual(vs[0]);
      } else expectClose(answerOf(slide), [vs[0] + quotedWith(slide, IMPULSE) / m], 'after');
    }
    choicesAgree(g.impulse);
    for (const { slide } of draws(g.bounceTree)) {
      const [m] = massesIn(slide);
      const [u, v] = velocitiesIn(slide);
      expectClose(answerOf(slide), [m * u, m * v, m * v - m * u], 'bounce tree');
      expect(Math.sign(u)).toBe(-Math.sign(v));
    }
  });

  it('the impulses in a collision are equal and opposite', () => {
    for (const { slide } of draws(g.impulsePairTiles)) {
      const { mA, mB, uA, uB, known: vA } = collisionRead(slide);
      const IA = mA * vA - mA * uA;
      const vB = uB - IA / mB;
      expectClose(answerOf(slide), [IA, -IA, vB], 'impulse pair');
      expect(close(mA * uA + mB * uB, mA * vA + mB * vB)).toBe(true);
    }
    for (const { slide } of draws(g.impulseSlider)) {
      const [m] = massesIn(slide);
      const [u] = velocitiesIn(slide);
      expectClose(answerOf(slide), [u + quotedWith(slide, IMPULSE) / m], 'impulse slider');
    }
  });

  it('Ft = mv - mu, for the velocity, the force or the time', () => {
    for (const { slide } of draws(g.ft)) {
      const [m] = massesIn(slide);
      const vs = velocitiesIn(slide);
      const lead = leadOf(slide);
      if (lead === 'F =') expectClose(answerOf(slide), [(m * vs[1] - m * vs[0]) / quotedWith(slide, SECONDS)], 'F');
      else if (lead === 't =') expectClose(answerOf(slide), [(m * vs[1] - m * vs[0]) / quotedWith(slide, NEWTONS)], 't');
      else expectClose(answerOf(slide), [vs[0] + (quotedWith(slide, NEWTONS) * quotedWith(slide, SECONDS)) / m], 'v');
    }
    choicesAgree(g.ft);
    for (const { slide } of draws(g.ftFlow)) {
      const [m] = massesIn(slide);
      const [u] = velocitiesIn(slide);
      const I = quotedWith(slide, NEWTONS) * quotedWith(slide, SECONDS);
      const v = u + I / m;
      expect(I).toBeLessThan(0);
      const way = v > 0 ? 'Still moving right, slower' : v < 0 ? 'Moving left' : 'At rest';
      expectPath(pathOf(slide), [I, I / m, way], 'Ft flow');
    }
  });

  it('impulse as a vector, from an impulse, a force for a time, or two velocities', () => {
    for (const { slide } of draws(g.impulseIjTiles)) {
      if (slide.kind !== 'tiles') throw new Error(slide.kind);
      const [m] = massesIn(slide);
      const vectors = vectorsIn(slide);
      const [, u] = vectors[0];
      const [unit, w] = vectors[1];
      let want: [number, number];
      if (slide.template.startsWith('\\mathbf{I}')) want = [m * w[0] - m * u[0], m * w[1] - m * u[1]];
      else if (unit === 'N') {
        const t = quotedWith(slide, SECONDS);
        want = [u[0] + (w[0] * t) / m, u[1] + (w[1] * t) / m];
      } else want = [u[0] + w[0] / m, u[1] + w[1] / m];
      expectClose(answerOf(slide), want, 'impulse vector');
    }
  });

  it('forces in stages: each impulse is Ft, and each stage starts where the last one left off', () => {
    for (const { slide } of draws(g.ftTable)) {
      const [m] = massesIn(slide);
      let [v] = velocitiesIn(slide);
      for (const [F, t, I, after] of filledTable(slide)) {
        expect(close(F * t, I), `F ${F} t ${t} gives ${I}`).toBe(true);
        v += (F * t) / m;
        expect(close(v, after), `velocity ${after}, expected ${v}`).toBe(true);
      }
    }
  });
});

/* ---------- Level 6: every energy, speed and power re-formed from the slide ---------- */

/** Every number quoted with a unit, in order: `$12\text{ N}$`, `$3.5\text{ m}$`, `$40\text{ J}$`. */
const allWith = (slide: Slide, unit: 'N' | 'm' | 'J'): number[] =>
  [...said(slide).matchAll(new RegExp(`\\$(-?[\\d.]+)\\\\text\\{ ${unit}\\}\\$`, 'g'))].map((m) => Number(m[1]));

/** The speeds quoted, in order, with "at rest" and "from rest" as 0. */
const speedsIn = (slide: Slide): number[] =>
  [...said(slide).matchAll(/(?:at|from) rest|\$([\d.]+)\\text\{ m s\}\^\{-1\}\$/g)].map((m) => (m[1] === undefined ? 0 : Number(m[1])));

/** The power quoted, in watts, whether written in watts or kilowatts. */
function powerIn(slide: Slide): number {
  const m = /\$([\d.]+)\\text\{ (k?)W\}\$/.exec(said(slide));
  if (!m) throw new Error(`no power in: ${said(slide)}`);
  return Number(m[1]) * (m[2] === 'k' ? 1000 : 1);
}

const muIn = (slide: Slide): number => Number(/\\mu = ([\d.]+)\$/.exec(said(slide))![1]);

/**
 * The angle's sine and cosine from however the prompt gives it: both as
 * decimals, as a tangent (the triangle drawn afresh with atan2), or as a sine
 * of one over a whole number. Null when there is no angle.
 */
function angleIn(slide: Slide): { sin: number; cos: number } | null {
  const text = said(slide);
  const tan = /\\tan\\alpha = \\tfrac\{(\d+)\}\{(\d+)\}/.exec(text);
  if (tan) {
    const a = Math.atan2(Number(tan[1]), Number(tan[2]));
    return { sin: Math.sin(a), cos: Math.cos(a) };
  }
  const over = /\\sin\\alpha = \\tfrac\{1\}\{(\d+)\}/.exec(text);
  if (over) {
    const s = 1 / Number(over[1]);
    return { sin: s, cos: Math.sqrt(1 - s * s) };
  }
  const sin = /\\sin\\alpha = ([\d.]+)/.exec(text);
  if (sin) {
    const cos = /\\cos\\alpha = ([\d.]+)/.exec(text);
    return { sin: Number(sin[1]), cos: cos ? Number(cos[1]) : Math.sqrt(1 - Number(sin[1]) ** 2) };
  }
  return null;
}

/** The whole speed with this kinetic energy per kilogram, failing if it is not whole: no root is rounded. */
function wholeSpeed(ke: number, m: number, where: string): number {
  const v = Math.sqrt((2 * ke) / m);
  expect(Math.abs(v - Math.round(v)), `${where}: speed ${v} is not whole`).toBeLessThan(1e-9);
  return Math.round(v);
}

/** On the half-metre lattice. */
const halfMetre = (d: number): boolean => Math.abs(d * 2 - Math.round(d * 2)) < 1e-9;

/** A steps slide keeps its value at every line and ends on it. */
function stepsHold(slide: Slide, want: number, where: string): void {
  if (slide.kind !== 'steps') throw new Error(`expected steps, got ${slide.kind}`);
  let line = slide.start;
  expect(close(lineValue(line), want), `${where}: ${line.join(' ')} is not ${want}`).toBe(true);
  for (const step of slide.reductions) {
    line = [...line.slice(0, step.span[0]), step.value, ...line.slice(step.span[1])];
    expect(close(lineValue(line), want), `${where}: ${line.join(' ')} is not ${want}`).toBe(true);
  }
  expect(line).toHaveLength(1);
}

describe('work, energy and power', TIME, () => {
  it('work is the force along the motion times the distance', () => {
    for (const { slide } of draws(g.work)) {
      const [T] = allWith(slide, 'N');
      const [d] = allWith(slide, 'm');
      const angle = angleIn(slide);
      expectClose(answerOf(slide), [T * (angle ? angle.cos : 1) * d], 'work');
    }
    choicesAgree(g.work);
    for (const { slide } of draws(g.workTable)) {
      const rows = filledTable(slide);
      expect(rows).toHaveLength(3);
      for (const [F, d, W] of rows) expect(close(F * d, W), `F ${F} d ${d} W ${W}`).toBe(true);
    }
  });

  it('an angled pull does work through its cosine part, and the weight does none', () => {
    for (const { slide } of draws(g.pullWorkFlow)) {
      const [T] = allWith(slide, 'N');
      const [d] = allWith(slide, 'm');
      const { cos } = angleIn(slide)!;
      const path = pathOf(slide);
      expectPath(path, ['$T\\cos\\alpha$', T * cos, T * cos * d, ...(path.length === 4 ? [0] : [])], 'pull flow');
    }
  });

  it('work against gravity is mg times the height gained', () => {
    for (const { slide } of draws(g.liftWorkSteps)) {
      const [m] = massesIn(slide);
      const [dist] = allWith(slide, 'm');
      const angle = angleIn(slide);
      const h = angle ? dist * angle.sin : dist;
      expect(halfMetre(h), `height ${h}`).toBe(true);
      stepsHold(slide, m * GRAV * h, 'lift');
    }
  });

  it('kinetic energy is half m v squared, run either way', () => {
    for (const { slide } of draws(g.ke)) {
      const lead = leadOf(slide);
      const [E] = allWith(slide, 'J');
      if (lead === 'v =') expectClose(answerOf(slide), [Math.sqrt((2 * E) / massesIn(slide)[0])], 'v');
      else if (lead === 'm =') expectClose(answerOf(slide), [(2 * E) / speedsIn(slide)[0] ** 2], 'm');
      else expectClose(answerOf(slide), [(massesIn(slide)[0] * speedsIn(slide)[0] ** 2) / 2], 'KE');
      if (lead === 'v =') expect(Number.isInteger(answerOf(slide)[0])).toBe(true);
    }
    choicesAgree(g.ke);
  });

  it('the potential energy slider lands on the height mgh says', () => {
    for (const { slide } of draws(g.peSlider)) {
      const [m] = massesIn(slide);
      const [E] = allWith(slide, 'J');
      const falls = said(slide).includes('falls from');
      const h = falls ? allWith(slide, 'm')[0] - E / (m * GRAV) : E / (m * GRAV);
      expectClose(answerOf(slide), [h], 'pe slider');
    }
  });

  it('the change in kinetic energy, each energy or through v squared minus u squared', () => {
    for (const { slide } of draws(g.keChangeTree)) {
      const [m] = massesIn(slide);
      const [u, v] = speedsIn(slide);
      const [kU, kV] = [(m * u * u) / 2, (m * v * v) / 2];
      if (v < u) expectClose(answerOf(slide), [u * u, v * v, v * v - u * u, kV - kU], 'slowing');
      else expectClose(answerOf(slide), [kU, kV, kV - kU], 'speeding up');
    }
  });

  it('potential energy lost on a fall is kinetic energy gained', () => {
    for (const { slide } of draws(g.energySwapFlow)) {
      const [m] = massesIn(slide);
      const [u] = speedsIn(slide);
      const [h] = allWith(slide, 'm');
      const pe = m * GRAV * h;
      const ke = (m * u * u) / 2 + pe;
      expectPath(pathOf(slide), [pe, ke, wholeSpeed(ke, m, 'fall')], 'fall');
    }
  });

  it('the work-energy principle on a smooth floor, for the speed, the force or the distance', () => {
    for (const { slide } of draws(g.workEnergy)) {
      const [m] = massesIn(slide);
      const speeds = speedsIn(slide);
      const lead = leadOf(slide);
      if (lead === 'v =') {
        const [P] = allWith(slide, 'N');
        const [d] = allWith(slide, 'm');
        const ke = (m * speeds[0] ** 2) / 2 + P * d;
        expectClose(answerOf(slide), [wholeSpeed(ke, m, 'v')], 'v');
      } else {
        const gain = (m * (speeds[1] ** 2 - speeds[0] ** 2)) / 2;
        if (lead === 'F =') expectClose(answerOf(slide), [gain / allWith(slide, 'm')[0]], 'F');
        else {
          const d = gain / allWith(slide, 'N')[0];
          expect(halfMetre(d)).toBe(true);
          expectClose(answerOf(slide), [d], 'd');
        }
      }
    }
    choicesAgree(g.workEnergy);
  });

  it('the work-energy tiles hold the masses, the speed before and the work done', () => {
    for (const { slide } of draws(g.workEnergyTiles)) {
      const [m] = massesIn(slide);
      const [u] = speedsIn(slide);
      const push = allWith(slide, 'N');
      const W = push.length > 0 ? push[0] * allWith(slide, 'm')[0] : m * GRAV * allWith(slide, 'm')[0];
      expectClose(answerOf(slide), [m, m, u, W], 'work-energy tiles');
      wholeSpeed((m * u * u) / 2 + W, m, 'tiles');
    }
  });

  it('the speed at the foot of a smooth slope, by energy', () => {
    for (const { slide } of draws(g.slopeSpeedTree)) {
      const [m] = massesIn(slide);
      const [u] = speedsIn(slide);
      const [dist] = allWith(slide, 'm');
      const angle = angleIn(slide);
      const h = angle ? dist * angle.sin : dist;
      const [pe, ke0] = [m * GRAV * h, (m * u * u) / 2];
      const v = wholeSpeed(ke0 + pe, m, 'slope');
      expectClose(answerOf(slide), [...(angle ? [h] : []), pe, ke0, ke0 + pe, v], 'slope speed');
    }
  });

  it('the kinetic energy gained is the net work: the pull less the resistance', () => {
    for (const { slide } of draws(g.netWorkSteps)) {
      const [P, R] = allWith(slide, 'N');
      const [d] = allWith(slide, 'm');
      const angle = angleIn(slide);
      const net = (P * (angle ? angle.cos : 1) - R) * d;
      expect(net).toBeGreaterThan(0);
      stepsHold(slide, net, 'net work');
    }
  });

  it('work against friction is mu R d, with R = mg cos(alpha) on a slope', () => {
    for (const { slide } of draws(g.frictionWork)) {
      const [m] = massesIn(slide);
      const [d] = allWith(slide, 'm');
      const angle = angleIn(slide);
      expectClose(answerOf(slide), [muIn(slide) * m * GRAV * (angle ? angle.cos : 1) * d], 'friction work');
    }
    choicesAgree(g.frictionWork);
  });

  it('friction takes all the kinetic energy by the time it stops', () => {
    for (const { slide } of draws(g.stoppingFlow)) {
      const [m] = massesIn(slide);
      const [u] = speedsIn(slide);
      const F = muIn(slide) * m * GRAV;
      const ke = (m * u * u) / 2;
      const path = pathOf(slide);
      expect(halfMetre(ke / F)).toBe(true);
      expectPath(path, [ke, F, ke / F, ...(path.length === 4 ? ['The same distance'] : [])], 'stopping flow');
    }
    for (const { slide } of draws(g.stoppingSlider)) {
      const [m] = massesIn(slide);
      const [u] = speedsIn(slide);
      const given = allWith(slide, 'N');
      const F = given.length > 0 ? given[0] : muIn(slide) * m * GRAV;
      const d = (m * u * u) / 2 / F;
      expect(halfMetre(d)).toBe(true);
      expectClose(answerOf(slide), [d], 'stopping slider');
    }
  });

  it('the speed after a rough stretch, slowed by friction or pulled against it', () => {
    for (const { slide } of draws(g.roughSpeedTree)) {
      const [m] = massesIn(slide);
      const [u] = speedsIn(slide);
      const [d] = allWith(slide, 'm');
      const pulls = allWith(slide, 'N');
      const ke0 = (m * u * u) / 2;
      const fw = muIn(slide) * m * GRAV * d;
      if (pulls.length > 0) {
        const pw = pulls[0] * d;
        expectClose(answerOf(slide), [ke0, pw, fw, ke0 + pw - fw, wholeSpeed(ke0 + pw - fw, m, 'pulled')], 'pulled');
      } else {
        expectClose(answerOf(slide), [ke0, fw, ke0 - fw, wholeSpeed(ke0 - fw, m, 'skid')], 'skid');
      }
    }
  });

  it('power is force times speed, run either way', () => {
    for (const { slide } of draws(g.power)) {
      const lead = leadOf(slide);
      if (lead === 'P =') expectClose(answerOf(slide), [allWith(slide, 'N')[0] * speedsIn(slide)[0]], 'P');
      else if (lead === 'F =') expectClose(answerOf(slide), [powerIn(slide) / speedsIn(slide)[0]], 'F');
      else expectClose(answerOf(slide), [powerIn(slide) / allWith(slide, 'N')[0]], 'v');
    }
    choicesAgree(g.power);
    for (const { slide } of draws(g.powerTable)) {
      for (const [F, v, P] of filledTable(slide)) expect(close(F * v, P), `F ${F} v ${v} P ${P}`).toBe(true);
    }
  });

  it('at top speed the driving force balances the resistance and the pull down the hill', () => {
    for (const { slide } of draws(g.topSpeedFlow)) {
      const [R] = allWith(slide, 'N');
      const angle = angleIn(slide);
      const F = R + (angle ? massesIn(slide)[0] * GRAV * angle.sin : 0);
      const v = powerIn(slide) / F;
      expect(Number.isInteger(v)).toBe(true);
      const path = pathOf(slide);
      expect(path[0]).toMatch(/^Equal to the resistance/);
      expectPath(path.slice(1), [F, v], 'top speed');
    }
  });

  it('the acceleration at a speed: P/v, less the resistance and the pull down the hill, over m', () => {
    for (const { slide } of draws(g.powerAccelTree)) {
      const [m] = massesIn(slide);
      const [R] = allWith(slide, 'N');
      const [v] = speedsIn(slide);
      const angle = angleIn(slide);
      const F = powerIn(slide) / v;
      const pull = angle ? m * GRAV * angle.sin : 0;
      expectClose(answerOf(slide), [F, ...(angle ? [pull] : []), F - R - pull, (F - R - pull) / m], 'power accel');
    }
  });
});
