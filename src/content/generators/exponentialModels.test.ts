/**
 * The Exponential Models level 7 generators, checked against arithmetic of
 * their own.
 *
 * The generic sweep in `generators.test.ts` proves each slide agrees with
 * itself: the bank holds the answer, the checker accepts it. It would pass a
 * residual worked the wrong way round, a model evaluated one step out, or a
 * verdict that does not follow from the numbers. And no level 7 slide is a
 * derivative or an integral, so the oracles there never look at them.
 *
 * So every check here starts from what the learner is shown. The model is
 * read back out of the prompt's TeX, `A e^{t ln b}` or `A e^{(ln b / h) t}` or
 * a line `c + s t`, the table out of its `array` (a `t` row over a row of
 * measurements), and the model is evaluated at every time as A b^(t/h) with
 * exact powers. From those come every residual, the largest, the sum of
 * squares, the first time the data leaves the model, and the range the data
 * covers; each quoted residual, time, verdict and choice is held to them, and
 * the answer worked out here, not the slide's own, is graded through
 * `startSession` and `reduce` the way a learner's would be.
 */
import { describe, it, expect } from 'vitest';
import { makeRng } from '../../engine/rng';
import { reduce, startSession } from '../../engine/session';
import type { Answer } from '../../engine/session';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';

const SEEDS = 150;
const DIFFICULTIES = [1, 2];

function draws(id: string) {
  const generator = registry[id] as unknown as Generator<unknown>;
  expect(generator, `no generator ${id}`).toBeDefined();
  return DIFFICULTIES.flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { slide: generator.render(params), seed, difficulty };
    }),
  );
}

/** The verdict the reducer gives an answer to this one slide. */
function verdict(slide: Slide, answer: Answer) {
  const lesson = { id: 'em-test', title: 'Test', slides: [], skillCheck: [{ type: 'literal' as const, slide }] };
  return reduce(startSession(lesson, registry, 1), { type: 'submit', answer }).feedback.kind;
}

/** Every piece of TeX a slide shows before it is answered. */
function shownTex(slide: Slide): string {
  const parts: string[] = [];
  if (slide.kind !== 'teach') {
    for (const block of slide.prompt) {
      if (block.kind === 'display') parts.push(block.tex);
      if (block.kind === 'prose') parts.push(block.text);
    }
  }
  if (slide.kind === 'flow') {
    parts.push(slide.subject);
    for (const step of slide.steps) parts.push(step.ask);
  }
  return parts.join(' \n ');
}

/** A number as TeX writes it: 20{,}000 is 20000. */
const whole = (text: string): number => Number(text.replace(/\{,\}/g, ''));

type Model = { kind: 'exp'; a: number; b: number; h: number; down: boolean } | { kind: 'line'; c: number; s: number };

const EXP = /(\d[\d{,}]*)e\^\{(-?)(?:t\\ln (\d)|\\frac\{\\ln (\d)\}\{(\d+)\}t)\}/;
const LINE = /^(\d+) ([+-]) (\d*)t$/;

function readModel(tex: string): Model | undefined {
  const exp = EXP.exec(tex);
  if (exp) {
    return {
      kind: 'exp',
      a: whole(exp[1]),
      b: Number(exp[3] ?? exp[4]),
      h: exp[5] === undefined ? 1 : Number(exp[5]),
      down: exp[2] === '-',
    };
  }
  const line = LINE.exec(tex.trim());
  if (line) return { kind: 'line', c: Number(line[1]), s: (line[2] === '-' ? -1 : 1) * (line[3] === '' ? 1 : Number(line[3])) };
  return undefined;
}

/** The model's value at t, exactly: a whole power of b needs t a whole number of steps h. */
function valueAt(model: Model, t: number): number {
  if (model.kind === 'line') return model.c + model.s * t;
  expect(Number.isInteger(t / model.h), `t = ${t} is not a whole number of steps of ${model.h}`).toBe(true);
  const power = model.b ** (t / model.h);
  const value = model.down ? model.a / power : model.a * power;
  expect(Number.isInteger(value), `the model is not whole at t = ${t}`).toBe(true);
  return value;
}

/** The one model a single-model prompt fits, read from its first sentence. */
function theModel(slide: Slide): Model {
  const model = readModel(shownTex(slide));
  expect(model, 'no model in the prompt').toBeDefined();
  return model!;
}

/** Models A and B from a two-model prompt's aligned display, a line each. */
function twoModels(slide: Slide): [Model, Model] {
  const aligned = /\\begin\{aligned\} (.*?) \\end\{aligned\}/.exec(shownTex(slide));
  expect(aligned, 'no aligned display of the two models').not.toBeNull();
  const byLabel = new Map<string, Model | undefined>();
  for (const line of aligned![1].split(' \\\\ ')) {
    const match = /^\\text\{([AB]):\} \\;\\; [A-Z] &= (.*)$/.exec(line);
    if (match) byLabel.set(match[1], readModel(match[2]));
  }
  expect(byLabel.get('A'), 'no model A').toBeDefined();
  expect(byLabel.get('B'), 'no model B').toBeDefined();
  return [byLabel.get('A')!, byLabel.get('B')!];
}

interface Table {
  times: number[];
  values: number[];
}

/** The table of measurements: a `t` row over one row of values. */
function theTable(slide: Slide): Table {
  if (slide.kind === 'table') {
    return { times: slide.rows.map((row) => Number(row[0])), values: slide.rows.map((row) => whole(row[1] as string)) };
  }
  const tex = shownTex(slide);
  // Too wide for a phone, the table is turned on its side: a row per time.
  const down = /\\begin\{array\}\{c\|c\} t & [A-Za-z] \\\\ \\hline (.*?) \\end\{array\}/.exec(tex);
  const across = /\\begin\{array\}\{c\|c+\} t & ([^\\]+) \\\\ \\hline [A-Za-z] & ([^\\]+) \\end\{array\}/.exec(tex);
  expect(down ?? across, 'no table in the prompt').not.toBeNull();
  const cells = down
    ? down[1].split(' \\\\ ').map((row) => row.split('&'))
    : [across![1].split('&'), across![2].split('&')].reduce<string[][]>(
        (rows, line, j) => line.map((cell, i) => (j === 0 ? [cell] : [...rows[i], cell])),
        [],
      );
  const times = cells.map((row) => Number(row[0].trim()));
  const values = cells.map((row) => whole(row[1].trim()));
  expect(times.length).toBe(values.length);
  // Equal steps of t, from 0.
  times.forEach((t, i) => expect(t).toBe(i * times[1]));
  return { times, values };
}

function residualsOf(model: Model, table: Table): number[] {
  return table.times.map((t, i) => table.values[i] - valueAt(model, t));
}

/** The residuals a prompt quotes, if it quotes them. */
function quotedResiduals(slide: Slide): number[] | undefined {
  const match = /\\text\{residuals: \} ([-\d,\\ ]+)/.exec(shownTex(slide));
  // A long list breaks over lines, so drop the line breaks' backslashes too.
  if (!match) return undefined;
  const cells = match[1].split(',').map((cell) => cell.replace(/\\/g, '').trim());
  expect(cells.every((cell) => /^-?\d+$/.test(cell)), cells.join('|')).toBe(true);
  return cells.map(Number);
}

const sizes = (res: number[]) => res.map(Math.abs);
const squares = (res: number[]) => res.reduce((sum, r) => sum + r * r, 0);
const largest = (res: number[]) => Math.max(...sizes(res));

/** A time quoted in the prose, by the words around it. */
function timeAfter(slide: Slide, pattern: RegExp): number {
  const match = pattern.exec(shownTex(slide));
  expect(match, `nothing matches ${pattern}`).not.toBeNull();
  return Number(match![1]);
}

function chosen(slide: Slide, label: string): string {
  expect(slide.kind).toBe('choice');
  if (slide.kind !== 'choice') return '';
  const option = slide.options.find((o) => o.label === label);
  expect(option, `no option ${label}`).toBeDefined();
  return option!.id;
}

describe('expm-residual', () => {
  it('asks for the measurement minus the model at the stated time', () => {
    let negative = 0;
    for (const { slide, seed } of draws('expm-residual')) {
      const t = timeAfter(slide, /residual at \$t = (\d+)\$/);
      const table = theTable(slide);
      const i = table.times.indexOf(t);
      expect(i, `seed ${seed}: t = ${t} is not in the table`).toBeGreaterThan(0);
      const r = table.values[i] - valueAt(theModel(slide), t);
      expect(r, `seed ${seed}`).not.toBe(0);
      if (r < 0) negative += 1;
      expect(verdict(slide, String(r)), `seed ${seed}`).toBe('correct');
      expect(verdict(slide, String(-r)), `seed ${seed}`).toBe('incorrect');
    }
    expect(negative).toBeGreaterThan(SEEDS * 0.3);
  });

  it('offers the same residual in its choice form', () => {
    for (const { slide, seed } of draws('expm-residual+choice')) {
      const t = timeAfter(slide, /residual at \$t = (\d+)\$/);
      const table = theTable(slide);
      const r = table.values[table.times.indexOf(t)] - valueAt(theModel(slide), t);
      expect(verdict(slide, chosen(slide, String(r))), `seed ${seed}`).toBe('correct');
    }
  });
});

describe('expm-predict-tree', () => {
  it('fills e^(kt), the model and the residual at the stated time', () => {
    for (const { slide, seed } of draws('expm-predict-tree')) {
      const t = timeAfter(slide, /residual at \$t = (\d+)\$/);
      const model = theModel(slide);
      const table = theTable(slide);
      const predicted = valueAt(model, t);
      expect(model.kind).toBe('exp');
      if (model.kind !== 'exp') continue;
      const factor = model.b ** (t / model.h);
      const expected = [model.down ? `\\frac{1}{${factor}}` : String(factor), String(predicted), String(table.values[table.times.indexOf(t)] - predicted)];
      expect(verdict(slide, expected), `seed ${seed}`).toBe('correct');
    }
  });
});

describe('expm-residual-tiles', () => {
  it('builds the measurement, the model worked or whole, and the residual', () => {
    for (const { slide, seed } of draws('expm-residual-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const t = timeAfter(slide, /residual at \$t = (\d+)\$/);
      const model = theModel(slide);
      if (model.kind !== 'exp') throw new Error('not an exponential');
      const table = theTable(slide);
      const observed = table.values[table.times.indexOf(t)];
      const predicted = valueAt(model, t);
      const expected =
        slide.answer.length === 4
          ? [String(observed), String(model.a), String(model.b ** (t / model.h)), String(observed - predicted)]
          : [String(observed), String(predicted), String(observed - predicted)];
      if (slide.answer.length === 4) expect(slide.template).toContain(model.down ? '\\div' : '\\times');
      expect(verdict(slide, expected), `seed ${seed}`).toBe('correct');
    }
  });
});

describe('expm-resid-column', () => {
  it('holds every given and missing cell to the model and the measurement', () => {
    for (const { slide, seed } of draws('expm-resid-column')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const model = theModel(slide);
      const expected: string[] = [];
      for (const row of slide.rows) {
        const t = Number(row[0]);
        const predicted = valueAt(model, t);
        const r = whole(row[1] as string) - predicted;
        if (row[2] === null) expected.push(String(predicted));
        else expect(whole(row[2]), `seed ${seed}: model at t = ${t}`).toBe(predicted);
        if (row[3] === null) expected.push(String(r));
        else expect(Number(row[3]), `seed ${seed}: residual at t = ${t}`).toBe(r);
      }
      expect(verdict(slide, expected), `seed ${seed}`).toBe('correct');
    }
  });
});

describe('expm-resid-largest', () => {
  it('gives the residual furthest from zero, or its time, and there is only one', () => {
    for (const id of ['expm-resid-largest', 'expm-resid-largest+choice']) {
      for (const { slide, seed } of draws(id)) {
        const table = theTable(slide);
        const res = residualsOf(theModel(slide), table);
        const top = largest(res);
        expect(sizes(res).filter((size) => size === top).length, `seed ${seed}: two furthest`).toBe(1);
        const i = sizes(res).indexOf(top);
        const byTime = /At what time/.test(shownTex(slide));
        if (slide.kind === 'expression') {
          expect(verdict(slide, String(byTime ? table.times[i] : res[i])), `seed ${seed}`).toBe('correct');
        } else {
          expect(verdict(slide, chosen(slide, byTime ? `t = ${table.times[i]}` : String(res[i]))), `seed ${seed}`).toBe('correct');
        }
      }
    }
  });
});

describe('expm-furthest-tree', () => {
  it('fills every residual, then the furthest from zero', () => {
    for (const { slide, seed } of draws('expm-furthest-tree')) {
      const res = residualsOf(theModel(slide), theTable(slide));
      const furthest = res[sizes(res).indexOf(largest(res))];
      expect(verdict(slide, [...res.map(String), String(furthest)]), `seed ${seed}`).toBe('correct');
    }
  });
});

/** A fair fit's residuals change sign; a wrong shape's keep one sign and grow. */
function pattern(res: number[]): 'fair' | 'above' | 'below' {
  if (res.some((r) => r > 0) && res.some((r) => r < 0)) return 'fair';
  const grows = res.every((r, i) => i === 0 || Math.abs(r) > Math.abs(res[i - 1]));
  expect(grows, `one sign but not growing: ${res.join(', ')}`).toBe(true);
  return res[0] > 0 ? 'above' : 'below';
}

describe('expm-pattern-flow', () => {
  it('quotes the residuals as they are, and walks to the verdict they give', () => {
    const seen = new Set<string>();
    for (const { slide, seed } of draws('expm-pattern-flow')) {
      const res = residualsOf(theModel(slide), theTable(slide));
      expect(quotedResiduals(slide), `seed ${seed}`).toEqual(res);
      const kind = pattern(res);
      seen.add(kind);
      const path = kind === 'fair' ? ['Yes', 'Yes', 'A fair fit'] : ['No', 'Yes', 'The wrong shape'];
      expect(verdict(slide, path), `seed ${seed}`).toBe('correct');
    }
    expect([...seen].sort()).toEqual(['above', 'below', 'fair']);
  });
});

describe('expm-pattern-choice', () => {
  it('marks right the reading the residuals give', () => {
    const seen = new Set<string>();
    for (const { slide, seed } of draws('expm-pattern-choice')) {
      const kind = pattern(residualsOf(theModel(slide), theTable(slide)));
      seen.add(kind);
      const label = {
        fair: 'A fair fit: small residuals either side of zero',
        above: 'The model is too low, by more each time',
        below: 'The model is too high, by more each time',
      }[kind];
      expect(verdict(slide, chosen(slide, label)), `seed ${seed}`).toBe('correct');
    }
    expect(seen.size).toBe(3);
  });
});

/**
 * That the data really leaves the model at column `from`: every residual
 * before it smaller than every one from it on, which all share a sign and
 * grow, while the data levels off.
 */
function leaving(res: number[], values: number[], from: number): void {
  expect(from, `the data leaves at once: ${res.join(', ')}`).toBeGreaterThan(1);
  const after = res.slice(from);
  expect(largest(res.slice(0, from)), `residuals ${res.join(', ')}`).toBeLessThan(Math.min(...sizes(after)));
  expect(after.every((r) => Math.sign(r) === Math.sign(after[0])), `residuals ${res.join(', ')}`).toBe(true);
  expect(after.every((r, j) => j === 0 || Math.abs(r) > Math.abs(after[j - 1])), `residuals ${res.join(', ')}`).toBe(true);
  // Levelling off: from the step into the column where the data leaves, each
  // step is smaller than the one before. And growth first speeds up, as the
  // exponential does, so the whole table is an S rather than a curve that
  // was slowing all along.
  const steps = values.slice(1).map((value, i) => Math.abs(value - values[i]));
  for (let i = from - 1; i < steps.length; i += 1) expect(steps[i], `steps ${steps.join(', ')}`).toBeLessThan(steps[i - 1]);
  if (values[values.length - 1] > values[0]) {
    for (let i = 1; i < from - 1; i += 1) expect(steps[i], `steps ${steps.join(', ')}`).toBeGreaterThan(steps[i - 1]);
    expect(from, 'growth leaves before it has sped up').toBeGreaterThanOrEqual(3);
  }
  // The residuals point away from where an exponential would go: data below a
  // growth model, above a decaying one.
  const rising = values[values.length - 1] > values[0];
  expect(Math.sign(res[res.length - 1])).toBe(rising ? -1 : 1);
}

describe('expm-leaves-slider', () => {
  it('lands on the first time the data is more than the stated margin away', () => {
    for (const { slide, seed } of draws('expm-leaves-slider')) {
      const margin = timeAfter(slide, /more than \$(\d+)\$ away/);
      const table = theTable(slide);
      const res = residualsOf(theModel(slide), table);
      const first = sizes(res).findIndex((size) => size > margin);
      leaving(res, table.values, first);
      // Once away it stays away.
      expect(sizes(res).slice(first).every((size) => size > margin), `seed ${seed}`).toBe(true);
      expect(verdict(slide, String(table.times[first])), `seed ${seed}`).toBe('correct');
      if (slide.kind === 'slider') expect(verdict(slide, String(table.times[first] + slide.step)), `seed ${seed}`).toBe('incorrect');
    }
  });
});

describe('expm-overshoot', () => {
  it('gives the size of the last residual', () => {
    for (const id of ['expm-overshoot', 'expm-overshoot+choice']) {
      for (const { slide, seed } of draws(id)) {
        const table = theTable(slide);
        const t = timeAfter(slide, /measurement at \$t = (\d+)\$/);
        expect(t).toBe(table.times[table.times.length - 1]);
        const res = residualsOf(theModel(slide), table);
        // The model is left behind: data below a growth model, above a decay.
        const rising = table.values[table.values.length - 1] > table.values[0];
        expect(Math.sign(res[res.length - 1]), `seed ${seed}`).toBe(rising ? -1 : 1);
        const gap = String(Math.abs(res[res.length - 1]));
        expect(verdict(slide, slide.kind === 'choice' ? chosen(slide, gap) : gap), `seed ${seed}`).toBe('correct');
      }
    }
  });
});

describe('expm-level-flow', () => {
  it('reads the side, the levelling and the model that fixes it from the numbers', () => {
    const seen = new Set<string>();
    for (const { slide, seed } of draws('expm-level-flow')) {
      const table = theTable(slide);
      const res = residualsOf(theModel(slide), table);
      expect(quotedResiduals(slide), `seed ${seed}`).toEqual(res);
      const from = table.times.indexOf(timeAfter(slide, /stops fitting at \$t = (\d+)\$/));
      leaving(res, table.values, from);
      const above = res[from] > 0;
      const falling = table.values[table.values.length - 1] < table.values[0];
      seen.add(falling ? 'bounded' : 'logistic');
      const path = [above ? 'Above the model' : 'Below the model', 'Levelling off', falling ? 'Bounded' : 'Logistic'];
      expect(verdict(slide, path), `seed ${seed}`).toBe('correct');
    }
    expect(seen.size).toBe(2);
  });
});

describe('expm-fix-choice', () => {
  it('offers logistic for growth that levels and a level for a fall that settles', () => {
    for (const { slide, seed } of draws('expm-fix-choice')) {
      const table = theTable(slide);
      const res = residualsOf(theModel(slide), table);
      const stated = /not from \$t = (\d+)\$/.exec(shownTex(slide));
      if (stated) leaving(res, table.values, table.times.indexOf(Number(stated[1])));
      // Stated or not, the last residuals share a sign and the data's last step is its smallest.
      const steps = table.values.slice(1).map((value, i) => Math.abs(value - table.values[i]));
      expect(steps[steps.length - 1], `seed ${seed}`).toBeLessThan(steps[steps.length - 2]);
      expect(Math.sign(res[res.length - 1]), `seed ${seed}`).toBe(Math.sign(res[res.length - 2]));
      const falling = table.values[table.values.length - 1] < table.values[0];
      const right = falling ? 'y = L + Be^{-kt}' : 'y = \\frac{L}{1 + Ae^{-kt}}';
      expect(verdict(slide, chosen(slide, right)), `seed ${seed}`).toBe('correct');
    }
  });
});

/** Both models' residuals against one table, A first. */
function pairResiduals(slide: Slide): [number[], number[]] {
  const table = theTable(slide);
  const [a, b] = twoModels(slide);
  return [residualsOf(a, table), residualsOf(b, table)];
}

describe('choosing between two fits', () => {
  it('has one model better on both counts, so the two measures never disagree', () => {
    for (const id of ['expm-squares-tree', 'expm-ssr', 'expm-better-tiles', 'expm-largest-flow']) {
      for (const { slide, seed } of draws(id)) {
        const [ra, rb] = pairResiduals(slide);
        expect(squares(ra) < squares(rb), `${id} seed ${seed}`).toBe(largest(ra) < largest(rb));
        expect(squares(ra), `${id} seed ${seed}`).not.toBe(squares(rb));
      }
    }
  });

  it('expm-squares-tree fills the asked model\'s residuals and their sum of squares', () => {
    for (const { slide, seed } of draws('expm-squares-tree')) {
      const which = /\$S_(A|B)\$\./.exec(shownTex(slide))![1];
      const res = pairResiduals(slide)[which === 'A' ? 0 : 1];
      expect(verdict(slide, [...res.map(String), String(squares(res))]), `seed ${seed}`).toBe('correct');
    }
  });

  it('expm-ssr gives the asked model\'s sum of squares', () => {
    for (const id of ['expm-ssr', 'expm-ssr+choice']) {
      for (const { slide, seed } of draws(id)) {
        const which = /What is \$S_(A|B)\$/.exec(shownTex(slide))![1];
        const total = String(squares(pairResiduals(slide)[which === 'A' ? 0 : 1]));
        expect(verdict(slide, slide.kind === 'choice' ? chosen(slide, total) : total), `${id} seed ${seed}`).toBe('correct');
      }
    }
  });

  it('expm-better-tiles gives both sums and names the smaller', () => {
    const winners = new Set<string>();
    for (const { slide, seed } of draws('expm-better-tiles')) {
      const [ra, rb] = pairResiduals(slide);
      const better = squares(ra) < squares(rb) ? 'A' : 'B';
      winners.add(better);
      expect(verdict(slide, [String(squares(ra)), String(squares(rb)), `\\text{${better}}`]), `seed ${seed}`).toBe('correct');
    }
    expect(winners.size).toBe(2);
  });

  it('expm-largest-flow gives each largest residual, then the smaller', () => {
    for (const { slide, seed } of draws('expm-largest-flow')) {
      const [ra, rb] = pairResiduals(slide);
      const path = [`$${largest(ra)}$`, `$${largest(rb)}$`, `Model ${largest(ra) < largest(rb) ? 'A' : 'B'}`];
      expect(verdict(slide, path), `seed ${seed}`).toBe('correct');
    }
  });
});

describe('expm-interp-value', () => {
  it('predicts at a time strictly between two measurements', () => {
    for (const id of ['expm-interp-value', 'expm-interp-value+choice']) {
      for (const { slide, seed } of draws(id)) {
        const t = timeAfter(slide, /no measurement at \$t = (\d+)\$/);
        const table = theTable(slide);
        expect(table.times, `seed ${seed}`).not.toContain(t);
        expect(t).toBeGreaterThan(0);
        expect(t).toBeLessThan(table.times[table.times.length - 1]);
        // The model fits the data, so interpolating it is fair.
        expect(pattern(residualsOf(theModel(slide), table))).toBe('fair');
        const value = String(valueAt(theModel(slide), t));
        expect(verdict(slide, slide.kind === 'choice' ? chosen(slide, value) : value), `${id} seed ${seed}`).toBe('correct');
      }
    }
  });
});

describe('expm-valid-line', () => {
  it('shades the range the data covers, or everything outside it', () => {
    for (const { slide, seed } of draws('expm-valid-line')) {
      const table = theTable(slide);
      const last = table.times[table.times.length - 1];
      const outside = /extrapolation/.test(shownTex(slide));
      const draft = outside ? `0o,${last}o/-inf:0,${last}:inf` : `0c,${last}c/0:${last}`;
      expect(verdict(slide, draft), `seed ${seed}`).toBe('correct');
      const wrong = outside ? `0c,${last}c/-inf:0,${last}:inf` : `0o,${last}o/0:${last}`;
      expect(verdict(slide, wrong), `seed ${seed}`).toBe('incorrect');
    }
  });
});

describe('expm-far-flow', () => {
  it('walks inside or out, then against the stated limit', () => {
    const seen = new Set<string>();
    for (const { slide, seed } of draws('expm-far-flow')) {
      const tex = shownTex(slide);
      const t = timeAfter(slide, /prediction at \$t = (\d+)\$/);
      const table = theTable(slide);
      const last = table.times[table.times.length - 1];
      const predicted = valueAt(theModel(slide), t);
      const quoted = /gives \$[A-Z] = ([\d{,}]+)\$ at/.exec(tex)!;
      expect(whole(quoted[1]), `seed ${seed}`).toBe(predicted);
      const limits = [...tex.matchAll(/(?:at most|has|is) \$([\d{,}]+)\$/g)].map((m) => whole(m[1]));
      const cap = whole(/more than \$([\d{,}]+)\$\?/.exec(tex)![1]);
      expect(limits, `seed ${seed}`).toContain(cap);
      expect(cap, `seed ${seed}: a limit the data has already passed`).toBeGreaterThan(Math.max(...table.values));
      const inside = t >= 0 && t <= last;
      if (inside) expect(table.times).not.toContain(t);
      const where = inside ? 'inside' : predicted > cap ? 'over' : 'under';
      seen.add(where);
      const path = { inside: ['Yes', 'Interpolation'], over: ['No', 'Yes', 'It cannot happen'], under: ['No', 'No', 'Only with caution'] }[where];
      expect(verdict(slide, path), `seed ${seed}`).toBe('correct');
    }
    expect(seen.size).toBe(3);
  });
});

describe('expm-trust-choice', () => {
  it('trusts only a time between measurements while the model still fits', () => {
    for (const { slide, seed } of draws('expm-trust-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice');
      const table = theTable(slide);
      const res = residualsOf(theModel(slide), table);
      const margin = timeAfter(slide, /(?:within|more than) \$(\d+)\$/);
      const from = sizes(res).findIndex((size) => size > margin);
      leaving(res, table.values, from);
      const stated = /from \$t = (\d+)\$ on/.exec(shownTex(slide));
      if (stated) expect(Number(stated[1])).toBe(table.times[from]);
      const fits = slide.options
        .map((option) => Number(option.label.replace('t = ', '')))
        .filter((t) => t > 0 && t < table.times[from - 1] + 1e-9 && !table.times.includes(t));
      expect(fits.length, `seed ${seed}: ${slide.options.map((o) => o.label).join(' | ')}`).toBe(1);
      expect(verdict(slide, chosen(slide, `t = ${fits[0]}`)), `seed ${seed}`).toBe('correct');
    }
  });
});
