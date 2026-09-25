/**
 * An independent check on the Inequalities in Two Variables & Regions level.
 *
 * The oracle in `generators.test.ts` skips every slide here, and the generic
 * property tests only prove a generator agrees with itself. So this file
 * trusts nothing the generator worked out. It reads the inequalities **as the
 * learner sees them**, from the displayed TeX, parses each side with mathjs,
 * reads the dot and the lines back out of the figure's SVG, and holds each
 * slide's claim against that: every point said to be inside is put through
 * every displayed inequality, every corner into both of its boundaries, every
 * count is made again by brute force, and every drawn line is dashed exactly
 * when its inequality is strict.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import { registry } from '../registry';
import type { Block, Generator, Slide } from '../types';

const SEEDS = 200;

const ids = Object.keys(registry).filter((id) => /^lin-(overlap|read|corner|lattice|story)-/.test(id));

/** Drawn once at collection, which is untimed, and shared by both checks. */
const DRAWS: Record<string, { slide: Slide; where: string }[]> = Object.fromEntries(
  ids.map((id) => {
    const generator = registry[id] as unknown as Generator<unknown>;
    return [
      id,
      [1, 2].flatMap((difficulty) =>
        Array.from({ length: SEEDS }, (_, seed) => ({
          slide: generator.render(generator.sample(makeRng(seed), difficulty)),
          where: `${id} difficulty ${difficulty} seed ${seed}`,
        })),
      ),
    ];
  }),
);

const draws = (id: string) => DRAWS[id];

/* ---------- Reading what is on the screen ---------- */

type Op = '<' | '<=' | '>' | '>=' | '=';

interface Rel {
  tex: string;
  op: Op;
  /** Left-hand side minus right-hand side, as mathjs reads them. */
  gap: (x: number, y: number) => number;
}

/** `2x - 3y \le 6` as mathjs reads it. */
function relation(tex: string): Rel {
  const plain = tex.replace(/\\le\b/g, '<=').replace(/\\ge\b/g, '>=').trim();
  const [, left, op, right] = /^(.*?)(<=|>=|<|>|=)(.*)$/.exec(plain)!;
  // Compiled once: `node.evaluate` recompiles on every call, and `sameRegion` asks thousands of times.
  const l = math.parse(left.trim()).compile();
  const r = math.parse(right.trim()).compile();
  return {
    tex,
    op: op as Op,
    gap: (x, y) => (l.evaluate({ x, y }) as number) - (r.evaluate({ x, y }) as number),
  };
}

function holdsAt(rel: Rel, x: number, y: number): boolean {
  const g = rel.gap(x, y);
  const zero = Math.abs(g) < 1e-9;
  if (rel.op === '<') return g < 0 && !zero;
  if (rel.op === '<=') return g < 0 || zero;
  if (rel.op === '>') return g > 0 && !zero;
  if (rel.op === '>=') return g > 0 || zero;
  return zero;
}

const onRel = (rel: Rel, x: number, y: number): boolean => Math.abs(rel.gap(x, y)) < 1e-9;

const strict = (rel: Rel): boolean => rel.op === '<' || rel.op === '>';

/** The relations in a stacked display, or a list joined by commas. */
function relations(tex: string): Rel[] {
  return tex
    .replace('\\begin{gathered}', '')
    .replace('\\end{gathered}', '')
    .split(/\\\\|,\s*\\quad|,\s*\\;/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map(relation);
}

const blocks = (slide: Slide): Block[] => ('prompt' in slide ? slide.prompt : []);

const displays = (slide: Slide): string[] =>
  blocks(slide)
    .filter((b): b is { kind: 'display'; tex: string } => b.kind === 'display')
    .map((b) => b.tex);

const proseOf = (slide: Slide): string =>
  blocks(slide)
    .filter((b): b is { kind: 'prose'; text: string } => b.kind === 'prose')
    .map((b) => b.text)
    .join(' ');

const svgOf = (slide: Slide): string | undefined => {
  const block = blocks(slide).find((b) => b.kind === 'diagram') as { svg: string } | undefined;
  if (block) return block.svg;
  return slide.kind === 'slider' ? slide.figure?.svg : undefined;
};

/** Every inline `$...$` in the prose that is an equation or inequality. */
const inlineRelations = (text: string): Rel[] =>
  [...text.matchAll(/\$([^$]*?(?:=|<|>|\\le|\\ge)[^$]*?)\$/g)]
    .map((m) => m[1])
    .filter((tex) => /[xy]/.test(tex) && !/^x = -?\d+$/.test(tex.trim()))
    .map(relation);

const pointIn = (text: string): [number, number] => {
  const found = /\((-?\d+), (-?\d+)\)/.exec(text);
  if (!found) throw new Error(`no point in ${text}`);
  return [Number(found[1]), Number(found[2])];
};

const filled = (slide: Extract<Slide, { kind: 'tiles' }>): string =>
  slide.template.replace(/\{(\d+)\}/g, (_, n: string) => slide.answer[Number(n)]);

const lastStep = (slide: Extract<Slide, { kind: 'steps' }>): string => slide.reductions[slide.reductions.length - 1].value;

/* The figure, read back into the plane. These are plotSvg's own constants. */

const WIDTH = 280;
const PAD = 12;

interface Figure {
  dots: [number, number][];
  lines: { dashed: boolean; points: [number, number][] }[];
}

function figure(svg: string, story: boolean): Figure {
  const [lo, hi] = story ? [-1, 11] : [-6, 6];
  const height = Number(/viewBox="0 0 280 (\d+)"/.exec(svg)![1]);
  const x = (px: number) => lo + ((px - PAD) / (WIDTH - 2 * PAD)) * (hi - lo);
  const y = (py: number) => hi - ((py - PAD) / (height - 2 * PAD)) * (hi - lo);
  const dots = [...svg.matchAll(/<circle cx="([\d.-]+)" cy="([\d.-]+)"/g)].map(
    (m) => [x(Number(m[1])), y(Number(m[2]))] as [number, number],
  );
  const lines = [...svg.matchAll(/<path fill="none" stroke="currentColor" stroke-width="2"([^>]*?) d="([^"]+)"/g)].map((m) => ({
    dashed: m[1].includes('stroke-dasharray'),
    points: [...m[2].matchAll(/([\d.-]+),([\d.-]+)/g)]
      .map((p) => [x(Number(p[1])), y(Number(p[2]))] as [number, number])
      .filter(([, v]) => v >= lo && v <= hi),
  }));
  return { dots, lines };
}

/** Does this drawn line run along the relation's boundary? */
function traces(line: Figure['lines'][number], rel: Rel): boolean {
  if (line.points.length < 2) return false;
  return line.points.every(([x, y]) => {
    const g = rel.gap(x, y);
    const slope = Math.hypot(rel.gap(x + 1, y) - g, rel.gap(x, y + 1) - g);
    return Math.abs(g) / slope < 0.05;
  });
}

/** Each drawn line is one of the relations, dashed exactly when that one is strict. */
function expectDrawn(fig: Figure, rels: Rel[], where: string): void {
  expect(fig.lines.length, `${where}: one line per boundary`).toBe(rels.length);
  for (const rel of rels) {
    const line = fig.lines.find((l) => traces(l, rel));
    expect(line, `${where}: ${rel.tex} is not drawn`).toBeDefined();
    expect(line!.dashed, `${where}: ${rel.tex} drawn ${line!.dashed ? 'dashed' : 'solid'}`).toBe(strict(rel));
  }
}

function expectDotInside(fig: Figure, rels: Rel[], where: string): void {
  expect(fig.dots.length, `${where}: one dot`).toBe(1);
  const [x, y] = fig.dots[0].map(Math.round);
  for (const rel of rels) expect(holdsAt(rel, x, y), `${where}: the dot (${x}, ${y}) fails ${rel.tex}`).toBe(true);
}

const LATTICE = Array.from({ length: 21 }, (_, i) => i - 10).flatMap((x) =>
  Array.from({ length: 21 }, (_, j) => [x, j - 10] as [number, number]),
);

const inside = (rels: Rel[]) => LATTICE.filter(([x, y]) => rels.every((rel) => holdsAt(rel, x, y)));

/** Where two lines meet, from the coefficients mathjs reads off them. */
function meet(one: Rel, two: Rel): [number, number] {
  const coefficients = (rel: Rel) => {
    const c = rel.gap(0, 0);
    return [rel.gap(1, 0) - c, rel.gap(0, 1) - c, -c];
  };
  const [a, b, e] = coefficients(one);
  const [c, d, f] = coefficients(two);
  const det = a * d - b * c;
  return [(e * d - b * f) / det + 0, (a * f - e * c) / det + 0];
}

/* ---------- The story, read from its words ---------- */

const WORDS: Record<string, Op> = {
  'at most': '<=',
  'no more than': '<=',
  'at least': '>=',
  'no less than': '>=',
  'less than': '<',
  'more than': '>',
};
const WORD = '(at most|no more than|at least|no less than|less than|more than)';

interface Story {
  /** The coefficients of x and y, read off whichever item each letter counts. */
  coefficients: [number, number];
  total: number;
  capOp: Op;
  min?: { letter: 'x' | 'y'; op: Op; k: number };
}

function storyOf(text: string): Story {
  const [, xItem, yItem] = /\$x\$ is the number of ([a-z ]+), \$y\$ of ([a-z ]+)\./.exec(text)!;
  const first = text.split('. ')[0];
  const each = (item: string) => Number(new RegExp(`${item}[^$]*\\$(\\d+)\\$`, 'i').exec(first)![1]);
  const [, capWord, total] = new RegExp(`must be ${WORD} (?:£)?\\$(\\d+)\\$`).exec(text)!;
  const min = new RegExp(`there must be ${WORD} \\$(\\d+)\\$ ([a-z ]+)\\.`).exec(text);
  return {
    coefficients: [each(xItem), each(yItem)],
    total: Number(total),
    capOp: WORDS[capWord],
    min: min ? { letter: min[3] === xItem ? 'x' : 'y', op: WORDS[min[1]], k: Number(min[2]) } : undefined,
  };
}

function storyRelations(story: Story): Rel[] {
  const [a, b] = story.coefficients;
  const out = [relation(`${a}*x + ${b}*y ${story.capOp} ${story.total}`)];
  if (story.min) out.push(relation(`${story.min.letter} ${story.min.op} ${story.min.k}`));
  return out;
}

const QUADRANT = Array.from({ length: 31 }, (_, x) => Array.from({ length: 31 }, (_, y) => [x, y] as [number, number])).flat();

/** The whole points of the first quadrant, and a little either side. */
const PROBES = QUADRANT.flatMap(([x, y]) => [0, 0.5].map((h) => [x + h, y + h] as [number, number]));

/**
 * Where one relation holds across `PROBES`, worked out once per relation as written.
 * The same TeX always reads as the same relation, and the stories repeat, so this is
 * what keeps `sameRegion` from putting every probe through mathjs again for every option.
 */
const HOLDS = new Map<string, boolean[]>();
const holdsAcross = (rel: Rel): boolean[] => {
  let holds = HOLDS.get(rel.tex);
  if (!holds) HOLDS.set(rel.tex, (holds = PROBES.map(([x, y]) => holdsAt(rel, x, y))));
  return holds;
};

/** Two systems describe the same region of whole points in the first quadrant, and a little either side. */
const sameRegion = (one: Rel[], two: Rel[]): boolean => {
  const [a, b] = [one.map(holdsAcross), two.map(holdsAcross)];
  return PROBES.every((_, i) => a.every((holds) => holds[i]) === b.every((holds) => holds[i]));
};

/* ---------- The checks ---------- */

describe.each(ids)('%s', (id) => {
  it('claims only what the screen shows', () => {
    for (const { slide, where } of draws(id)) {
      const text = proseOf(slide);
      const shown = displays(slide).flatMap(relations);
      const svg = svgOf(slide);
      const fig = svg ? figure(svg, id.startsWith('lin-story-')) : undefined;

      if (id.startsWith('lin-overlap-')) {
        const system = slide.kind === 'flow' ? relations(slide.subject) : shown;
        expect(system.length, where).toBe(2);
        const [x, y] = slide.kind === 'choice' ? [0, 0] : pointIn(text);
        const passes = system.map((rel) => holdsAt(rel, x, y));
        if (slide.kind === 'flow') expect(slide.answer, where).toEqual(passes[0] ? ['Yes', passes[1] ? 'Yes' : 'No'] : ['No']);
        if (slide.kind === 'choice') {
          for (const option of slide.options) {
            const [px, py] = pointIn(option.label);
            const right = system.every((rel) => holdsAt(rel, px, py));
            expect(right, `${where}: ${option.label}`).toBe(option.id === slide.correctId);
          }
        }
        if (slide.kind === 'tree') {
          const sides = slide.expression.split('\\quad \\text{and} \\quad').map((side) => math.parse(side.trim()));
          const at = (scope: Record<string, number>) => sides.map((side) => (side.evaluate(scope) as number) + 0);
          const totals = slide.answer.slice(-2).map(Number);
          expect(totals, where).toEqual(at({ x, y }));
          if (slide.answer.length === 6) {
            const n = slide.answer.map(Number);
            expect([n[0] + n[1], n[2] + n[3]], where).toEqual(totals);
          }
        }
        if (slide.kind === 'expression') {
          expect(holdsAt(system[0], x, y), `${where}: said to pass the first`).toBe(true);
          const side = math.parse(slide.lead!.replace(/=$/, '').trim());
          expect(Number(slide.answer), where).toBe((side.evaluate({ x, y }) as number) + 0);
        }
      }

      if (id === 'lin-read-signs' && slide.kind === 'tiles') {
        const rels = relations(filled(slide));
        expectDrawn(fig!, rels, where);
        expectDotInside(fig!, rels, where);
      }

      if (id === 'lin-read-system' && slide.kind === 'choice') {
        for (const option of slide.options) {
          const rels = relations(option.label);
          const right = option.id === slide.correctId;
          if (right) {
            expectDrawn(fig!, rels, where);
            expectDotInside(fig!, rels, where);
          } else {
            // Wrong: a line drawn the other way, or the dot left out.
            const drawn = fig!.lines.every((l) => rels.some((rel) => traces(l, rel) && l.dashed === strict(rel)));
            const [x, y] = fig!.dots[0].map(Math.round);
            expect(drawn && rels.every((rel) => holdsAt(rel, x, y)), `${where}: ${option.label} also fits`).toBe(false);
          }
        }
      }

      if (id === 'lin-read-flow' && slide.kind === 'flow') {
        const line = relation(slide.subject);
        const drawn = fig!.lines.find((l) => traces(l, line));
        expect(drawn, `${where}: ${slide.subject} not drawn`).toBeDefined();
        expect(slide.answer[0], where).toBe(drawn!.dashed ? 'Dashed' : 'Solid');
        const [x, y] = fig!.dots[0].map(Math.round);
        const up = line.gap(x, y) > 0;
        expect(slide.answer[1], where).toBe(slide.subject.startsWith('y =') ? (up ? 'Above' : 'Below') : up ? 'More' : 'Less');
      }

      if (id === 'lin-read-line' && slide.kind === 'expression') {
        const value = Number(slide.answer);
        const rel =
          slide.lead === 'c ='
            ? relation(`y = ${Number(/gradient \$(-?\d+)\$/.exec(text)![1])} * x + ${value}`)
            : relation(`y = ${value} * x + ${Number(/axis at \$(-?\d+)\$/.exec(text)![1])}`);
        const matches = fig!.lines.filter((l) => traces(l, rel));
        expect(matches.length, `${where}: no drawn line is ${rel.tex}`).toBe(1);
      }

      if (id.startsWith('lin-corner-')) {
        const named = shown.length === 2 ? shown : inlineRelations(text).slice(0, 2);
        expect(named.length, where).toBe(2);
        const [cx, cy] = meet(named[0], named[1]);
        expect(Number.isInteger(cx) && Number.isInteger(cy), `${where}: corner (${cx}, ${cy})`).toBe(true);
        if (slide.kind === 'slider') {
          expect(slide.answer, where).toBe(cx);
          for (const rel of named) expect(fig!.lines.some((l) => traces(l, rel)), `${where}: ${rel.tex} not drawn`).toBe(true);
        }
        if (slide.kind === 'expression') expect(Number(slide.answer), where).toBe(slide.lead === 'x =' ? cx : cy);
        if (slide.kind === 'steps') expect(lastStep(slide), where).toBe(`x = ${cx}`);
        if (slide.kind === 'tree') {
          const sides = slide.expression.split('\\quad \\text{and} \\quad').map((side) => math.parse(side.trim()));
          const at = (scope: Record<string, number>) => sides.map((side) => (side.evaluate(scope) as number) + 0);
          const n = slide.answer.map(Number);
          if (n.length === 4) {
            const x = Number(/\$x = (-?\d+)\$/.exec(text)![1]);
            expect(x, where).toBe(cx);
            expect(n.slice(2), where).toEqual(at({ x }));
            expect(n[2], `${where}: the lines disagree`).toBe(cy);
          } else {
            const [x, y] = pointIn(text);
            expect(n.slice(4), where).toEqual(at({ x, y }));
            expect([n[0] + n[1], n[2] + n[3]], where).toEqual(n.slice(4));
            // The point is on the first line, whether or not it is the corner.
            expect(onRel(named[0], x, y), `${where}: (${x}, ${y}) is not on ${named[0].tex}`).toBe(true);
          }
        }
      }

      if (id.startsWith('lin-lattice-')) {
        const system = slide.kind === 'flow' ? relations(slide.subject) : shown;
        expect(system.length, where).toBe(3);
        if (fig) expectDrawn(fig, system, where);
        const points = inside(system);
        if (slide.kind === 'expression') expect(Number(slide.answer), where).toBe(points.length);
        if (slide.kind === 'choice') {
          for (const option of slide.options) {
            const [px, py] = pointIn(option.label);
            expect(system.every((rel) => holdsAt(rel, px, py)), `${where}: ${option.label}`).toBe(option.id === slide.correctId);
          }
        }
        if (slide.kind === 'tiles') {
          const column = Number(/put \$\((-?\d+), y\)\$/.exec(text)![1]);
          const ys = points.filter(([x]) => x === column).map(([, y]) => y);
          expect(filled(slide), where).toBe(`y = ${ys.join(', \\; ')}`.replace(/(^|\s)-(\d)/g, '$1- $2'));
        }
        if (slide.kind === 'flow') {
          const [x, y] = pointIn(text);
          const on = system.filter((rel) => onRel(rel, x, y));
          expect(on.length, `${where}: a corner`).toBeLessThan(2);
          const counts = system.every((rel) => holdsAt(rel, x, y));
          const path =
            on.length === 0 ? ['No', counts ? 'Yes' : 'No'] : strict(on[0]) ? ['Yes', 'Dashed'] : ['Yes', 'Solid', counts ? 'Yes' : 'No'];
          expect(slide.answer, where).toEqual(path);
        }
      }

      if (id.startsWith('lin-story-')) {
        const story = storyOf(text);
        const words = storyRelations(story);
        if (slide.kind === 'tiles') {
          const written = relation(filled(slide));
          expect(written.op, where).toBe(story.capOp);
          const c = written.gap(0, 0);
          expect([written.gap(1, 0) - c, written.gap(0, 1) - c, -c], where).toEqual([...story.coefficients, story.total]);
        }
        if (slide.kind === 'choice') {
          for (const option of slide.options) {
            const rels = [...relations(option.label), relation('x >= 0'), relation('y >= 0')];
            expect(sameRegion(rels, [...words, relation('x >= 0'), relation('y >= 0')]), `${where}: ${option.label}`).toBe(
              option.id === slide.correctId,
            );
          }
        }
        if (slide.kind === 'expression' || slide.kind === 'steps') {
          // The corner where the total's line meets the minimum, from the words.
          const [cap, min] = words;
          const [mx, my] = meet(relation(cap.tex.replace(/<=|>=|<|>/, '=')), relation(min.tex.replace(/<=|>=|<|>/, '=')));
          expect(Number.isInteger(mx) && Number.isInteger(my) && mx >= 0 && my >= 0, `${where}: corner (${mx}, ${my})`).toBe(true);
          if (slide.kind === 'steps') {
            const [letter, value] = lastStep(slide).split(' = ');
            expect(Number(value), where).toBe(letter === 'x' ? mx : my);
          } else {
            // Every corner of the region the words describe, by brute force.
            const region = [...words, relation('x >= 0'), relation('y >= 0')];
            expect(sameRegion(region, [...shown, relation('x >= 0'), relation('y >= 0')]), `${where}: display is not the story`).toBe(true);
            const bounds = region.map((rel) => relation(rel.tex.replace(/<=|>=|<|>/, '=')));
            const corners = bounds
              .flatMap((one, i) => bounds.slice(i + 1).map((two) => meet(one, two)))
              .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && region.every((rel) => holdsAt(rel, x, y)));
            expect(Number(slide.answer), where).toBe(Math.max(...corners.map(([x, y]) => x + y)));
            expect(fig!.lines.some((l) => traces(l, bounds[0])), `${where}: the total's line is not drawn`).toBe(true);
            if (/corners are/.test(text)) {
              const listed = [...text.matchAll(/\$\((-?\d+), (-?\d+)\)\$/g)].map((m) => `${m[1]},${m[2]}`).sort();
              expect(listed, where).toEqual([...new Set(corners.map(([x, y]) => `${x},${y}`))].sort());
            }
          }
        }
      }
    }
  });

  it('never offers two tiles that read the same', () => {
    for (const { slide, where } of draws(id)) {
      const banks =
        slide.kind === 'tiles' || slide.kind === 'tree'
          ? [[...new Set(slide.bank)]]
          : slide.kind === 'steps'
            ? slide.reductions.map((r) => r.bank)
            : slide.kind === 'choice'
              ? [slide.options.map((o) => o.label)]
              : [];
      for (const bank of banks) {
        const read = bank.map((token) => token.replace(/\s+/g, ''));
        expect(new Set(read).size, `${where}: ${JSON.stringify(bank)}`).toBe(new Set(bank).size);
      }
    }
  });
});
