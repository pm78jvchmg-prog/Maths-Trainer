/**
 * An independent check on the Modelling with Linear Equations level.
 *
 * The oracle in `generators.test.ts` skips every slide here, since none is
 * calculus, and the generic sweep only proves a generator agrees with
 * itself: it would pass a break-even count that is one out, or a tile bank
 * whose answer is the wrong equation. So this file trusts nothing the
 * generator worked out and never looks at its parameters. It reads every
 * number and name off the prompt as the learner sees it, solves the story
 * again by its own route, and holds each slide against that: every typed
 * answer and chosen option, every tile equation compared term by term with
 * the story's own, every tree node and table cell, every line of a steps
 * slide (each must still be true at the story's answer, and every value
 * offered in its place but the right one must make it false), every flow
 * branch, and every slider. Last, the reducer has to accept the answer as
 * the learner would give it.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { reduce, startSession } from '../../engine/session';
import type { Answer } from '../../engine/session';
import { math } from '../../engine/expression';
import { choiceId } from '../choiceVariant';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';

const SEEDS = 150;
const DIFFICULTIES = [1, 2];

/** Rendered once at collection, which is untimed, and shared by every check. */
const DRAWS = new Map<string, { slide: Slide; where: string }[]>();

function draws(id: string): { slide: Slide; where: string }[] {
  const cached = DRAWS.get(id);
  if (cached) return cached;
  const generator = registry[id] as unknown as Generator<unknown>;
  expect(generator, `no generator ${id}`).toBeDefined();
  const out = DIFFICULTIES.flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => ({
      slide: generator.render(generator.sample(makeRng(seed), difficulty)),
      where: `${id} difficulty ${difficulty} seed ${seed}`,
    })),
  );
  DRAWS.set(id, out);
  return out;
}

/** The verdict the reducer gives an answer to this one slide. */
function verdict(slide: Slide, answer: Answer) {
  const lesson = { id: 'le-test', title: 'Test', slides: [], skillCheck: [{ type: 'literal' as const, slide }] };
  return reduce(startSession(lesson, registry, 1), { type: 'submit', answer }).feedback.kind;
}

/* ---------- Reading what is on the screen ---------- */

const proseOf = (slide: Slide): string =>
  slide.kind === 'teach'
    ? ''
    : slide.prompt
        .filter((b): b is { kind: 'prose'; text: string } => b.kind === 'prose')
        .map((b) => b.text)
        .join(' ');

const displayOf = (slide: Slide): string =>
  slide.kind === 'teach'
    ? ''
    : slide.prompt
        .filter((b): b is { kind: 'display'; tex: string } => b.kind === 'display')
        .map((b) => b.tex)
        .join(' ');

/** The first capture of `pattern` in `text`, as a number. */
function read(text: string, pattern: RegExp, where: string): number {
  const found = pattern.exec(text);
  expect(found, `${where}: nothing matches ${pattern} in ${text}`).not.toBeNull();
  return Number(found![1]);
}

const isWhole = (value: number): boolean => Math.abs(value - Math.round(value)) < 1e-9;

/** TeX as mathjs reads it. */
const plain = (tex: string): string =>
  tex
    .replace(/\\div/g, '/')
    .replace(/\\times/g, '*')
    .replace(/\\%/g, '')
    .trim();

/** Left side minus right side of an equation written in TeX, at the given values. */
function gap(equation: string, scope: Record<string, number>): number {
  const sides = plain(equation).split('=');
  expect(sides.length, `not one equation: ${equation}`).toBe(2);
  const [left, right] = sides.map((side) => math.evaluate(side, { ...scope }) as number);
  return left - right;
}

const holds = (equation: string, scope: Record<string, number>): boolean => Math.abs(gap(equation, scope)) < 1e-9;

/** A tiles template with its blanks filled. */
const filled = (template: string, tokens: readonly string[]): string =>
  template.replace(/\{(\d+)\}/g, (_, i: string) => tokens[Number(i)]);

/**
 * The same equation, term for term: left minus right agrees with the
 * story's own left minus right at several values of every letter. An
 * equation scaled or with a different collection would agree only at the
 * answer, so this is stricter than "has the same solution".
 */
function sameEquation(tiles: string, expected: (scope: Record<string, number>) => number, letters: string[]): boolean {
  const points = [
    [0, 0],
    [1, 2],
    [3, -1],
    [-2, 5],
  ];
  return points.every((values) => {
    const scope = Object.fromEntries(letters.map((letter, i) => [letter, values[i]]));
    return Math.abs(gap(tiles, scope) - expected(scope)) < 1e-9;
  });
}

const tiles = (slide: Slide) => {
  expect(slide.kind).toBe('tiles');
  return slide as Extract<Slide, { kind: 'tiles' }>;
};

const optionLabelled = (slide: Slide, label: string): string => {
  expect(slide.kind).toBe('choice');
  const choice = slide as Extract<Slide, { kind: 'choice' }>;
  const matching = choice.options.filter((option) => option.label === label);
  expect(matching.length, `option ${label} offered ${matching.length} times in ${choice.options.map((o) => o.label).join(' | ')}`).toBe(1);
  return matching[0].id;
};

/* ---------- Lesson 1: naming the unknown ---------- */

interface Relation {
  of: string;
  m: number;
  d: number;
}

const TIMES: Record<string, number> = { twice: 2, 'three times': 3, 'four times': 4 };

/** The three names in the order introduced, and how each count is described. */
function nameStory(text: string, where: string) {
  const intro = /(\w+), (\w+) and (\w+) collect (\w+)\./.exec(text);
  expect(intro, `${where}: no introduction`).not.toBeNull();
  const listed = [intro![1], intro![2], intro![3]];
  const relations = new Map<string, Relation>();
  const sentence = /(\w+) has (?:\$(\d+)\$ (more|fewer) than )?(?:(twice|three times|four times) as many as )?(\w+)\./g;
  for (const match of text.matchAll(sentence)) {
    const size = match[2] ? Number(match[2]) : 0;
    relations.set(match[1], { of: match[5], m: match[4] ? TIMES[match[4]] : 1, d: match[3] === 'fewer' ? -size : size });
  }
  expect(relations.size, `${where}: expected two descriptions`).toBe(2);
  const base = listed.filter((name) => !relations.has(name));
  expect(base.length, `${where}: one name should be described from nothing`).toBe(1);
  /** A count as coefficient of the base's number, plus a constant. */
  const termOf = (name: string): [number, number] => {
    if (name === base[0]) return [1, 0];
    const rel = relations.get(name)!;
    const [k, c] = termOf(rel.of);
    return [rel.m * k, rel.m * c + rel.d];
  };
  return { listed, base: base[0], relations, termOf, thing: intro![4] };
}

/** The whole story solved: the base's count from the total, and everyone's count. */
function nameSolved(text: string, where: string) {
  const story = nameStory(text, where);
  const T = read(text, /Together they have \$(\d+)\$/, where);
  const terms = story.listed.map(story.termOf);
  const K = terms.reduce((s, [k]) => s + k, 0);
  const C = terms.reduce((s, [, c]) => s + c, 0);
  const x = (T - C) / K;
  expect(isWhole(x) && x >= 1, `${where}: the total gives x = ${x}`).toBe(true);
  const count = (name: string) => {
    const [k, c] = story.termOf(name);
    return k * x + c;
  };
  for (const name of story.listed) expect(count(name), `${where}: ${name} has ${count(name)}`).toBeGreaterThanOrEqual(1);
  return { ...story, T, K, C, x, count };
}

describe('naming the unknown', () => {
  it('lin-name-letter offers the one every count is written from', () => {
    for (const { slide, where } of draws('lin-name-letter')) {
      const { base } = nameStory(proseOf(slide), where);
      const id = optionLabelled(slide, `\\text{the number ${base} has}`);
      expect(verdict(slide, id), where).toBe('correct');
    }
  });

  it('lin-name-express writes the count asked for from $x$', () => {
    for (const { slide, where } of draws('lin-name-express')) {
      const text = proseOf(slide);
      const story = nameStory(text, where);
      expect(text, where).toContain(`Let $x$ be the number of ${story.thing} ${story.base} has.`);
      const name = /Write the number (\w+) has/.exec(text)![1];
      const [k, c] = story.termOf(name);
      const t = tiles(slide);
      const written = filled(t.template, t.answer);
      for (const x of [0, 1, 4, -3]) {
        expect(math.evaluate(written, { x }), `${where}: ${written}`).toBe(k * x + c);
      }
      // No other arrangement of the bank writes the same count.
      for (const other of arrangements(t.bank, t.answer.length)) {
        const text2 = filled(t.template, other);
        const same = [0, 1, 4, -3].every((x) => {
          try {
            return math.evaluate(text2, { x }) === k * x + c;
          } catch {
            return false;
          }
        });
        if (same) expect(other, `${where}: ${text2} also writes it`).toEqual(t.answer);
      }
      expect(verdict(slide, t.answer), where).toBe('correct');
    }
  });

  it('lin-name-total is the story collected, term for term', () => {
    for (const { slide, where } of draws('lin-name-total')) {
      const text = proseOf(slide);
      const { K, C, T, base } = nameSolved(text, where);
      expect(text, where).toContain(`Let $x$ be the number ${base} has.`);
      const t = tiles(slide);
      expect(sameEquation(filled(t.template, t.answer), ({ x }) => K * x + C - T, ['x']), where).toBe(true);
      expect(verdict(slide, t.answer), where).toBe('correct');
    }
  });

  it('lin-name-solve answers for the person asked about, typed and chosen', () => {
    for (const id of ['lin-name-solve', choiceId('lin-name-solve')]) {
      for (const { slide, where } of draws(id)) {
        const text = proseOf(slide) + displayOf(slide);
        const solved = nameSolved(text, where);
        const who = /How many does (\w+) have\?/.exec(text)![1];
        expect(who, where).not.toBe(solved.base);
        const value = solved.count(who);
        if (slide.kind === 'expression') {
          expect(slide.lead, where).toBe(`\\text{${who}'s ${solved.thing}} =`);
          expect(verdict(slide, `${value}`), where).toBe('correct');
          expect(verdict(slide, `${solved.x}`), where).toBe('incorrect');
        } else {
          expect(verdict(slide, optionLabelled(slide, `${value}`)), where).toBe('correct');
        }
      }
    }
  });

  it('lin-name-tree fills in the number moved across, $x$ and both counts', () => {
    for (const { slide, where } of draws('lin-name-tree')) {
      expect(slide.kind).toBe('tree');
      if (slide.kind !== 'tree') continue;
      const text = proseOf(slide);
      const solved = nameSolved(text, where);
      expect(text, where).toContain(`$${plainLinear(solved.K, solved.C)} = ${solved.T}$`);
      const [, second, third] = /find (\w+)'s and (\w+)'s/.exec(text)!;
      expect(slide.answer, where).toEqual([`${solved.T - solved.C}`, `${solved.x}`, `${solved.count(second)}`, `${solved.count(third)}`]);
      // The third count feeds from whoever the story describes it from.
      const from = solved.relations.get(third)!.of === second ? 'second' : 'x';
      expect(slide.nodes[3].from, where).toEqual([from]);
      expect(verdict(slide, slide.answer), where).toBe('correct');
    }
  });
});

/** `4x - 1` as the prompt writes a collected left-hand side. */
function plainLinear(k: number, c: number): string {
  const lead = k === 1 ? 'x' : `${k}x`;
  return c === 0 ? lead : `${lead} ${c < 0 ? '-' : '+'} ${Math.abs(c)}`;
}

/** Every way to fill `n` blanks from a bank, each tile used once. */
function arrangements(bank: readonly string[], n: number): string[][] {
  if (n === 0) return [[]];
  const out: string[][] = [];
  bank.forEach((token, i) => {
    const rest = [...bank.slice(0, i), ...bank.slice(i + 1)];
    for (const tail of arrangements(rest, n - 1)) out.push([token, ...tail]);
  });
  return out;
}

/* ---------- Lesson 2: break-even ---------- */

/** Fixed cost, cost to make one, price: each has a phrase of its own, in either order. */
function evenStory(text: string, where: string) {
  const F = read(text, /pays £\$(\d+)\$/, where);
  const c = read(text, /costs £\$(\d+)\$ to make/, where);
  const p = read(text, /sells for £\$(\d+)\$/, where);
  expect(p, `${where}: sells at or below cost`).toBeGreaterThan(c);
  return { F, c, p, n: F / (p - c) };
}

describe('break-even', () => {
  it('lin-even-count is the fixed cost over what each sale makes, typed and chosen', () => {
    for (const id of ['lin-even-count', choiceId('lin-even-count')]) {
      for (const { slide, where } of draws(id)) {
        const { n } = evenStory(proseOf(slide), where);
        expect(isWhole(n), `${where}: break-even at ${n}`).toBe(true);
        if (slide.kind === 'expression') {
          expect(verdict(slide, `${n}`), where).toBe('correct');
          expect(verdict(slide, `${n + 1}`), where).toBe('incorrect');
        } else {
          expect(verdict(slide, optionLabelled(slide, `${n}`)), where).toBe('correct');
        }
      }
    }
  });

  it('lin-even-tiles is income equals costs, term for term', () => {
    for (const { slide, where } of draws('lin-even-tiles')) {
      const { F, c, p } = evenStory(proseOf(slide), where);
      const t = tiles(slide);
      expect(sameEquation(filled(t.template, t.answer), ({ n }) => p * n - F - c * n, ['n']), where).toBe(true);
      expect(verdict(slide, t.answer), where).toBe('correct');
    }
  });

  it('lin-even-slider stops where income meets costs, inside the track', () => {
    for (const { slide, where } of draws('lin-even-slider')) {
      expect(slide.kind).toBe('slider');
      if (slide.kind !== 'slider') continue;
      const { n } = evenStory(proseOf(slide), where);
      expect(slide.answer, where).toBe(n);
      expect(n, where).toBeLessThan(slide.max);
      expect(slide.figure?.svg, where).toContain('<svg');
      expect(verdict(slide, `${n}`), where).toBe('correct');
      expect(verdict(slide, `${n - 1}`), where).toBe('incorrect');
    }
  });

  it('lin-even-table fills every cost and income, one row at break-even', () => {
    for (const { slide, where } of draws('lin-even-table')) {
      expect(slide.kind).toBe('table');
      if (slide.kind !== 'table') continue;
      const { F, c, p, n } = evenStory(proseOf(slide), where);
      const expected: string[] = [];
      for (const row of slide.rows) {
        const k = Number(row[0]);
        const cells = [`${F + c * k}`, `${p * k}`];
        cells.forEach((cell, i) => {
          if (row[i + 1] === null) expected.push(cell);
          else expect(row[i + 1], `${where}: given cell`).toBe(cell);
        });
      }
      expect(slide.answer, where).toEqual(expected);
      expect(slide.rows.map((row) => Number(row[0])), where).toContain(n);
      expect(verdict(slide, slide.answer), where).toBe('correct');
    }
  });

  it('lin-even-flow says profit or loss, and offers its size once', () => {
    for (const { slide, where } of draws('lin-even-flow')) {
      expect(slide.kind).toBe('flow');
      if (slide.kind !== 'flow') continue;
      const text = proseOf(slide);
      const { F, c, p } = evenStory(text, where);
      const k = read(text, /It sells \$(\d+)\$/, where);
      const profit = p * k - F - c * k;
      const size = `£$${Math.abs(profit)}$`;
      if (profit === 0) {
        expect(slide.answer, where).toEqual(['Exactly the same']);
      } else {
        expect(slide.answer, where).toEqual([profit > 0 ? 'Yes, more' : 'No, less', size]);
        const step = slide.steps.find((s) => s.id === (profit > 0 ? 'profit' : 'loss'))!;
        expect(step.branches.filter((b) => b.label === size).length, where).toBe(1);
      }
      expect(verdict(slide, slide.answer), where).toBe('correct');
    }
  });
});

/* ---------- Lesson 3: rates ---------- */

/** A gap, two speeds, and a head start in hours for the first if there is one. */
function meetStory(text: string, where: string) {
  const D = read(text, /\$(\d+)\$ km apart/, where);
  const speeds = [...text.matchAll(/at \$(\d+)\$ km\/h/g)].map((m) => Number(m[1]));
  expect(speeds.length, where).toBe(2);
  const late = /follows \$(\d+)\$ hours? later/.exec(text);
  const h = late ? Number(late[1]) : 0;
  const [u, v] = speeds;
  return { D, u, v, h, t: (D - u * h) / (u + v) };
}

/** A catch-up: a head start in km, or the one behind setting off later from the same place. */
function catchStory(text: string, where: string) {
  const ahead = /starts \$(\d+)\$ km ahead at \$(\d+)\$ km\/h, and \w+ follows at \$(\d+)\$ km\/h/.exec(text);
  if (ahead) {
    const [s, u, v] = [1, 2, 3].map((i) => Number(ahead[i]));
    return { s, u, v, late: 0, t: s / (v - u) };
  }
  const late = /at \$(\d+)\$ km\/h\. \w+ leaves the same place \$(\d+)\$ hours? later at \$(\d+)\$ km\/h/.exec(text);
  expect(late, `${where}: no catch-up story`).not.toBeNull();
  const [u, h, v] = [1, 2, 3].map((i) => Number(late![i]));
  // v(t - h) = ut, with t counted from the first one's start.
  return { s: 0, u, v, late: h, t: (v * h) / (v - u) };
}

function tankStory(text: string, where: string) {
  const v0 = read(text, /has \$(\d+)\$ litres in it/, where);
  const fill = read(text, /in at \$(\d+)\$ litres/, where);
  const drain = read(text, /out at \$(\d+)\$ litres/, where);
  const V = read(text, /holds? \$(\d+)\$ litres/, where);
  return { v0, fill, drain, V, t: (V - v0) / (fill - drain) };
}

/**
 * A steps slide replayed: every line must still be an equation true at the
 * answer, and every other value offered for a step must make it false.
 */
function replaySteps(slide: Slide, letter: string, value: number, where: string) {
  expect(slide.kind).toBe('steps');
  if (slide.kind !== 'steps') return;
  let line = [...slide.start];
  expect(holds(line.join(' '), { [letter]: value }), `${where}: ${line.join(' ')}`).toBe(true);
  for (const step of slide.reductions) {
    const [from, to] = step.span;
    for (const offered of step.bank) {
      const next = [...line.slice(0, from), offered, ...line.slice(to)].join(' ');
      expect(holds(next, { [letter]: value }), `${where}: ${next} with ${letter} = ${value}`).toBe(offered === step.value);
    }
    line = [...line.slice(0, from), step.value, ...line.slice(to)];
  }
  expect(line, where).toEqual([`${letter} = ${value}`]);
  expect(verdict(slide, slide.reductions.map((step) => step.value)), where).toBe('correct');
}

describe('rates', () => {
  it('lin-rate-meet is the gap over the closing speed, typed and chosen', () => {
    for (const id of ['lin-rate-meet', choiceId('lin-rate-meet')]) {
      for (const { slide, where } of draws(id)) {
        const text = proseOf(slide) + displayOf(slide);
        const { t, h } = meetStory(text, where);
        expect(isWhole(t) && t >= 1, `${where}: they meet at ${t}`).toBe(true);
        if (h > 0) expect(text, where).toMatch(/How many hours after \w+ sets off do they meet\?/);
        if (slide.kind === 'expression') {
          expect(verdict(slide, `${t}`), where).toBe('correct');
          expect(verdict(slide, `${t + 1}`), where).toBe('incorrect');
        } else {
          expect(verdict(slide, optionLabelled(slide, `${t}`)), where).toBe('correct');
        }
      }
    }
  });

  it('lin-rate-where-tree closes the gap and splits it between the two', () => {
    for (const { slide, where } of draws('lin-rate-where-tree')) {
      expect(slide.kind).toBe('tree');
      if (slide.kind !== 'tree') continue;
      const { D, u, v, h, t } = meetStory(proseOf(slide), where);
      expect(h, where).toBe(0);
      expect(slide.answer, where).toEqual([`${u + v}`, `${t}`, `${u * t}`, `${v * t}`]);
      expect(u * t + v * t, where).toBe(D);
      expect(verdict(slide, slide.answer), where).toBe('correct');
    }
  });

  it('lin-rate-catch stops where the lines cross, on a whole hour', () => {
    for (const { slide, where } of draws('lin-rate-catch')) {
      expect(slide.kind).toBe('slider');
      if (slide.kind !== 'slider') continue;
      const { t, late } = catchStory(proseOf(slide), where);
      expect(isWhole(t) && t > late, `${where}: catch at ${t}`).toBe(true);
      expect(slide.answer, where).toBe(t);
      expect(t, where).toBeLessThan(slide.max);
      expect(verdict(slide, `${t}`), where).toBe('correct');
      expect(verdict(slide, `${t + 1}`), where).toBe('incorrect');
    }
  });

  it('lin-rate-tank reaches its level on a whole minute, every line true on the way', () => {
    for (const { slide, where } of draws('lin-rate-tank')) {
      expect(slide.kind).toBe('steps');
      if (slide.kind !== 'steps') continue;
      const { v0, fill, drain, V, t } = tankStory(proseOf(slide), where);
      expect(isWhole(t) && t >= 1, `${where}: t = ${t}`).toBe(true);
      expect(slide.start, where).toEqual([`${v0}`, `+ (${fill} - ${drain})t`, '=', `${V}`]);
      replaySteps(slide, 't', t, where);
    }
  });

  it('lin-rate-tiles is the meeting, catching or tank equation, term for term', () => {
    const seen = new Set<string>();
    for (const { slide, where } of draws('lin-rate-tiles')) {
      const text = proseOf(slide);
      const t = tiles(slide);
      const written = filled(t.template, t.answer);
      if (text.includes('km apart')) {
        const { D, u, v, t: time } = meetStory(text, where);
        expect(isWhole(time), where).toBe(true);
        expect(sameEquation(written, (s) => u * s.t + v * s.t - D, ['t']), where).toBe(true);
        seen.add('meet');
      } else if (text.includes('km ahead')) {
        const { s, u, v, t: time } = catchStory(text, where);
        expect(isWhole(time), where).toBe(true);
        expect(sameEquation(written, (sc) => v * sc.t - s - u * sc.t, ['t']), where).toBe(true);
        seen.add('catch');
      } else {
        const { v0, fill, drain, V, t: time } = tankStory(text, where);
        expect(isWhole(time) && time >= 1, where).toBe(true);
        expect(sameEquation(written, (sc) => v0 + (fill - drain) * sc.t - V, ['t']), where).toBe(true);
        seen.add('tank');
      }
      expect(verdict(slide, t.answer), where).toBe('correct');
    }
    expect([...seen].sort()).toEqual(['catch', 'meet', 'tank']);
  });
});

/* ---------- Lesson 4: mixtures ---------- */

/** Two prices or strengths, the amount made and its target, and the amounts that solve it. */
function mixStory(text: string, where: string) {
  const price = /at £\$(\d+)\$ per kg with .*? at £\$(\d+)\$ per kg, to make \$(\d+)\$ kg of .*? at £\$(\d+)\$ per kg/.exec(text);
  const strength = /that is \$(\d+)\\%\$ .*? one that is \$(\d+)\\%\$ .*?make \$(\d+)\$ litres that is \$(\d+)\\%\$/.exec(text);
  const found = price ?? strength;
  expect(found, `${where}: no mixture`).not.toBeNull();
  const [a, b, M, m] = [1, 2, 3, 4].map((i) => Number(found![i]));
  const x = (M * (m - b)) / (a - b);
  return { a, b, M, m, x, y: M - x, price: price !== null };
}

/** A mixture that makes sense: whole, positive amounts of both. */
function mixSolved(text: string, where: string) {
  const story = mixStory(text, where);
  expect(isWhole(story.x) && story.x >= 1 && story.y >= 1, `${where}: amounts ${story.x} and ${story.y}`).toBe(true);
  return story;
}

/** The two equations of a stacked choice label. */
const stacked = (label: string): string[] =>
  label
    .replace('\\begin{gathered}', '')
    .replace('\\end{gathered}', '')
    .split('\\\\')
    .map((line) => line.trim());

describe('mixtures', () => {
  it('lin-mix-pair offers one pair true of the blend, and three that are not', () => {
    for (const { slide, where } of draws('lin-mix-pair')) {
      expect(slide.kind).toBe('choice');
      if (slide.kind !== 'choice') continue;
      const { x, y } = mixSolved(proseOf(slide), where);
      const right = slide.options.filter((option) => stacked(option.label).every((eq) => holds(eq, { x, y })));
      expect(right.map((option) => option.id), where).toEqual([slide.correctId]);
      expect(verdict(slide, slide.correctId), where).toBe('correct');
    }
  });

  it('lin-mix-tiles is the cost or strength equation, term for term', () => {
    for (const { slide, where } of draws('lin-mix-tiles')) {
      const { a, b, M, m } = mixSolved(proseOf(slide), where);
      const t = tiles(slide);
      expect(sameEquation(filled(t.template, t.answer), (s) => a * s.x + b * s.y - m * M, ['x', 'y']), where).toBe(true);
      expect(verdict(slide, t.answer), where).toBe('correct');
    }
  });

  it('lin-mix-solve gives the amount of the one asked for, typed and chosen', () => {
    for (const id of ['lin-mix-solve', choiceId('lin-mix-solve')]) {
      for (const { slide, where } of draws(id)) {
        const text = proseOf(slide) + displayOf(slide);
        const { x, y, a, b, price } = mixSolved(text, where);
        const asked = /How many (?:kg|litres) of (.+) go in\?/.exec(text)![1];
        const first = price ? /blends (.+?) at £/.exec(text)![1] : `the $${a}\\%$ solution`;
        const second = price ? /per kg with (.+?) at £/.exec(text)![1] : `the $${b}\\%$ one`;
        expect([first, second], where).toContain(asked);
        const value = asked === first ? x : y;
        if (slide.kind === 'expression') {
          expect(verdict(slide, `${value}`), where).toBe('correct');
          if (x !== y) expect(verdict(slide, `${asked === first ? y : x}`), where).toBe('incorrect');
        } else {
          expect(verdict(slide, optionLabelled(slide, `${value}`)), where).toBe('correct');
        }
      }
    }
  });

  it('lin-mix-substitute-steps keeps every line true, ending at the first amount', () => {
    for (const { slide, where } of draws('lin-mix-substitute-steps')) {
      expect(slide.kind).toBe('steps');
      if (slide.kind !== 'steps') continue;
      const { a, b, M, m, x } = mixSolved(proseOf(slide), where);
      expect(slide.start, where).toEqual([`${a}x`, `+ ${b}(${M} - x)`, '=', `${m * M}`]);
      replaySteps(slide, 'x', x, where);
    }
  });

  it('lin-mix-slider stops at the first amount, inside the track', () => {
    for (const { slide, where } of draws('lin-mix-slider')) {
      expect(slide.kind).toBe('slider');
      if (slide.kind !== 'slider') continue;
      const { x, M } = mixSolved(proseOf(slide), where);
      expect(slide.answer, where).toBe(x);
      expect(slide.max, where).toBe(M);
      expect(verdict(slide, `${x}`), where).toBe('correct');
      expect(verdict(slide, `${x + 1}`), where).toBe('incorrect');
    }
  });

  it('lin-mix-flow leans towards whichever there is more of', () => {
    const seen = new Set<string>();
    for (const { slide, where } of draws('lin-mix-flow')) {
      expect(slide.kind).toBe('flow');
      if (slide.kind !== 'flow') continue;
      const { x, y } = mixSolved(proseOf(slide), where);
      const expected = x === y ? ['Yes'] : ['No', x > y ? 'Yes' : 'No'];
      seen.add(expected.join(' '));
      expect(slide.answer, where).toEqual(expected);
      expect(verdict(slide, slide.answer), where).toBe('correct');
    }
    expect(seen.size, 'every lean drawn').toBe(3);
  });
});

/* ---------- Lesson 5: reading the model back ---------- */

/**
 * Every rearrangement slide, and every way of filling its blanks from the
 * bank, tried against the formula on screen. Worked out here, at collection,
 * which is untimed: a few hundred arrangements a slide, each evaluated at
 * three points, is too much to pay inside a test's budget.
 */
const REARRANGED = draws('lin-back-rearrange').map(({ slide, where }) => {
  const t = tiles(slide);
  const formula = displayOf(slide);
  const subject = /make \$(\w)\$ the subject/.exec(proseOf(slide))![1];
  const [other, rhs] = formula.split('=').map((side) => side.trim());
  const values = [1, 2, 5].map((value) => ({ value, result: math.evaluate(rhs, { [subject]: value }) as number }));
  /** Does this arrangement give back the subject, from the formula's own value, at every point? */
  const undoes = (tokens: readonly string[]): boolean => {
    try {
      const rearranged = math.compile(plain(filled(t.template, tokens)).split('=')[1]);
      return values.every(({ value, result }) => Math.abs((rearranged.evaluate({ [other]: result }) as number) - value) < 1e-9);
    } catch {
      return false;
    }
  };
  const others = arrangements(t.bank, t.answer.length)
    .filter((tokens) => tokens.join('|') !== t.answer.join('|') && undoes(tokens))
    .map((tokens) => filled(t.template, tokens));
  return { slide, where, inverts: undoes(t.answer), others };
});

describe('reading the model back', () => {
  it('lin-back-which offers exactly one equation true at the story answer', () => {
    const kinds = new Set<string>();
    for (const { slide, where } of draws('lin-back-which')) {
      expect(slide.kind).toBe('choice');
      if (slide.kind !== 'choice') continue;
      const text = proseOf(slide);
      let scope: Record<string, number>;
      if (text.includes('One bill came to')) {
        const fee = read(text, /charges £\$(\d+)\$/, where);
        const rate = read(text, /plus £\$(\d+)\$/, where);
        const total = read(text, /came to £\$(\d+)\$/, where);
        const letter = /for \$(\w)\$/.exec(text)![1];
        scope = { [letter]: (total - fee) / rate };
        kinds.add('charge');
      } else if (text.includes('km apart')) {
        const { t } = meetStory(text, where);
        scope = { t };
        kinds.add('meet');
      } else if (text.includes('break-even')) {
        const { n } = evenStory(text, where);
        scope = { n };
        kinds.add('even');
      } else {
        const { x } = mixSolved(text, where);
        scope = { x };
        kinds.add('mix');
      }
      for (const value of Object.values(scope)) expect(isWhole(value) && value >= 1, `${where}: ${value}`).toBe(true);
      const right = slide.options.filter((option) => holds(option.label, scope));
      expect(right.map((option) => option.id), `${where}: true at ${JSON.stringify(scope)}`).toEqual([slide.correctId]);
      expect(verdict(slide, slide.correctId), where).toBe('correct');
    }
    expect([...kinds].sort()).toEqual(['charge', 'even', 'meet', 'mix']);
  });

  it('lin-back-sense-flow states what the model really gives, and why it fails', () => {
    const reasons = new Set<string>();
    for (const { slide, where } of draws('lin-back-sense-flow')) {
      expect(slide.kind).toBe('flow');
      if (slide.kind !== 'flow') continue;
      const text = proseOf(slide);
      const stated = /gives \$(\w) = (-?[\d.]+)\$\.$/.exec(text);
      expect(stated, `${where}: no stated answer`).not.toBeNull();
      const value = Number(stated![2]);
      let reason: string | undefined;
      if (text.includes('break-even')) {
        const { n } = evenStory(text, where);
        expect(value, where).toBeCloseTo(n, 9);
        if (!isWhole(n)) reason = 'A count has to be a whole number';
      } else if (text.includes('km ahead')) {
        const { t } = catchStory(text, where);
        expect(value, where).toBe(t);
        if (t < 0) reason = 'A time cannot be negative';
      } else {
        const { x, M } = mixStory(text, where);
        expect(value, where).toBe(x);
        if (x > M) reason = 'It is more than the whole amount';
      }
      reasons.add(reason ?? 'fine');
      expect(slide.answer, where).toEqual(reason ? ['No', reason] : ['Yes']);
      expect(verdict(slide, slide.answer), where).toBe('correct');
    }
    expect(reasons.size, 'every reason drawn').toBe(4);
  });

  it('lin-back-change finds the new break-even count from the changed story, typed and chosen', () => {
    for (const id of ['lin-back-change', choiceId('lin-back-change')]) {
      for (const { slide, where } of draws(id)) {
        const text = proseOf(slide) + displayOf(slide);
        const [before, after] = text.split('Next time');
        const old = evenStory(before, where);
        expect(isWhole(old.n), where).toBe(true);
        const told = /It breaks even at \$(\d+)\$/.exec(before);
        if (told) expect(Number(told[1]), where).toBe(old.n);
        const F = /pays £\$(\d+)\$/.exec(after);
        const c = /costs £\$(\d+)\$ to make/.exec(after);
        const p = /sells for £\$(\d+)\$/.exec(after);
        expect([F, c, p].filter(Boolean).length, `${where}: one number changes`).toBe(1);
        const next = (F ? Number(F[1]) : old.F) / ((p ? Number(p[1]) : old.p) - (c ? Number(c[1]) : old.c));
        expect(isWhole(next) && next >= 1 && next !== old.n, `${where}: now ${next}`).toBe(true);
        if (slide.kind === 'expression') {
          expect(verdict(slide, `${next}`), where).toBe('correct');
          expect(verdict(slide, `${old.n}`), where).toBe('incorrect');
        } else {
          expect(verdict(slide, optionLabelled(slide, `${next}`)), where).toBe('correct');
        }
      }
    }
  });

  it('lin-back-rearrange undoes the formula, and no other arrangement of the bank does', () => {
    for (const { slide, where, inverts, others } of REARRANGED) {
      const t = tiles(slide);
      expect(inverts, `${where}: ${filled(t.template, t.answer)} does not undo ${displayOf(slide)}`).toBe(true);
      expect(others, `${where}: other arrangements also undo it`).toEqual([]);
      expect(verdict(slide, t.answer), where).toBe('correct');
    }
  });
});
