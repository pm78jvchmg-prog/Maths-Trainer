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
import type { Generator, Slide } from '../types';
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
