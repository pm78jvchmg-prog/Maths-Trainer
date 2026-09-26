/**
 * The generic generator sweep: sixteen property tests over every registered
 * generator, across 200 seeds at each difficulty.
 *
 * A generator is a small program that writes questions, so a bug in one does
 * not surface as a crash. It surfaces as a question that cannot be answered
 * correctly, halfway through a lesson on a train. These run every generator
 * across many seeds and assert that the answer it claims is the answer the
 * checker will accept — and, where a generator declares its source function,
 * that the answer is genuinely correct rather than merely self-consistent.
 *
 * Generators come from the registry, so a new one is covered the moment it
 * is exported — there is nothing to wire up here or in the shard files.
 *
 * The sweep is most of the suite's running time, and as one test file it ran
 * in one worker: close to an hour on one core while the others sat idle, and
 * every generator's draws sampled up front and held for the whole run. So it
 * is split across the `generators.sweep-NN.test.ts` files beside
 * `generators.test.ts`, which vitest runs in parallel. Each is one line,
 * `sweepShard(import.meta.url)`, and takes its shard number from its own file
 * name, so a copied file cannot sweep the wrong slice. A generator's shard is
 * a hash of its id, so adding one moves no other. `generators.test.ts` checks
 * that the shard files are all there and that between them they sweep every
 * registered generator exactly once.
 *
 * This file is in a folder of its own because the registry imports every
 * `.ts` file directly in `generators/`, and this one imports vitest.
 */
import { afterAll, describe, it, expect } from 'vitest';
import katex from 'katex';
import { makeRng } from '../../../engine/rng';
import { checkAnswer } from '../../../engine/equivalence';
import { parseExpression, math } from '../../../engine/expression';
import { registeredGenerators } from '../../registry';
import {
  isPairPath,
  pairOwner,
  reduceAt,
  renderExpr,
  targetAt,
  targets,
  toTex,
  valueOf,
  type Expr,
} from '../../expr';
import { canonicalSet, parseSet } from '../../numberLine';
import { canonicalForces, headsClash } from '../../forces';
import { CHOICE_SUFFIX } from '../../choiceVariant';
import { tokenValue } from '../probTree';
import {
  IDENTITY,
  encodeTransform,
  parseTransform,
  reachable,
  sameCurve,
  transformTex,
  transformed,
} from '../../transform';
import { docFromKeys, toAnswer } from '../../../ui/mathInput';
import type { Generator } from '../../types';
import { equalPairs, slideValues } from './optionValue';

const FULL_SEEDS = 200;

/**
 * Seeds per difficulty: 200, unless `SWEEP_SEEDS` names another count.
 *
 * Only the smoke run in Fast checks sets it (to 5), so every generator's answer
 * still meets the checker on each pull request at a fortieth of the draws;
 * `npm test` leaves it unset and sweeps the full 200. A value that is not a
 * whole number above zero is refused rather than quietly read as 200.
 */
export const SEEDS = sweepSeeds(import.meta.env.SWEEP_SEEDS);

function sweepSeeds(value: unknown): number {
  if (value === undefined || value === '') return FULL_SEEDS;
  const seeds = Number(value);
  if (!Number.isInteger(seeds) || seeds < 1) {
    throw new Error(`SWEEP_SEEDS must be a whole number above zero, not ${JSON.stringify(value)}`);
  }
  return seeds;
}

/**
 * Choice generators whose options are *meant* to share a value, for the
 * same-value check. Narrow on purpose: each names the rule it is let off and
 * why, and anything not listed is held to both.
 *
 * - `form`: the question is about how a value is written, not what it is, so
 *   every option may be worth the same. The right option can match a
 *   distractor, and so can two distractors.
 * - `distractors`: the options are slips in the working, and two different
 *   slips may land on one number. A distractor still may never equal the
 *   right option.
 */
const SAME_VALUE_BY_DESIGN: Record<string, { rule: 'form' | 'distractors'; why: string }> = {
  'mat-shape': { rule: 'form', why: '2 x 3 is an order, rows by columns, not a product' },
  'divide-which-multiplier': { rule: 'form', why: 'every option is a fraction equal to 1; the question is which one to multiply by' },
  'bin-out-first-which': { rule: 'form', why: 'every option rewrites the same number; the question is which one the expansion is valid for' },
  'frac-cancel-which': { rule: 'form', why: 'the question is which fraction can be cancelled, and the cancelled one is worth the same' },
  'prf-counter-pick': { rule: 'form', why: 'each option is a case of the claim, like 5 + 13, and its total is not what is asked' },
  'bin-conjugate-which': { rule: 'distractors', why: 'the trap is that (root k - 1)^n is the other combination in disguise' },
  'bin-series-stops-choice': { rule: 'distractors', why: 'the powers are disguised, 8/4 beside 2, and seeing through that is the question' },
  'coord-half-base-choice': { rule: 'distractors', why: 'each option is a slip in the working, and two slips can give one area' },
  'prob-cf-joint-which': { rule: 'distractors', why: 'each option is a slip in the working, and two slips can give one number' },
  'numer-bound-ends': { rule: 'distractors', why: 'each option writes different ends into one calculation, and two can come to the same' },
  'numer-closest-choice': { rule: 'distractors', why: '3.7 and 3.70 are two estimates to different places that happen to agree' },
};

/** Tiles a bank may repeat beyond what the answer needs; see the repeated-tile check. */
const SIGN_TILES = new Set(['+', '-', '+\\infty', '-\\infty']);
const DIFFICULTIES = [1, 2];

// A backslash-stripped command like "overline{3 + 4i}" is perfectly valid TeX
// — it renders the literal letters — so KaTeX raises nothing and the learner
// just sees a wrong slide. Only a name check catches it. Shared between the
// authored-content sweep (literal slides) and the generator sweep (generated
// TeX), so a stripped backslash cannot hide in either source.
export const BARE_TEX_COMMAND =
  /(?<!\\)\b(qquad|quad|overline|dfrac|tfrac|frac|sqrt|cdot|times|pm|geq|leq|rightarrow|implies|arg|sin|cos|tan|ln|pi|text|left|right)\b/;

/**
 * What a tile shows the learner, as comparable text. The MathML half of KaTeX's
 * output carries the source TeX in an annotation, so comparing whole HTML
 * would tell `- 8` from `-8` even though they draw the same "−8" — which is
 * exactly how two identical tiles hid in six generators.
 */
const renderedTile = (tex: string): string =>
  katex
    .renderToString(tex, { throwOnError: false, strict: false })
    .replace(/<span class="katex-mathml">[\s\S]*?<\/math><\/span>/, '')
    .replace(/\u2212/g, '-')
    .replace(/\s+/g, ' ');

/** Pairs of bank tokens spelled differently that the learner sees as one tile. */
export const lookalikeTiles = (bank: readonly string[]): string[] => {
  const seen = new Map<string, string>();
  const clashes: string[] = [];
  for (const token of new Set(bank)) {
    const shown = renderedTile(token);
    const earlier = seen.get(shown);
    if (earlier !== undefined) clashes.push(`${JSON.stringify(earlier)} and ${JSON.stringify(token)}`);
    else seen.set(shown, token);
  }
  return clashes;
};

/** How many `generators.sweep-NN.test.ts` files the sweep is split across. */
export const SWEEP_SHARDS = 24;

type RegisteredGenerator = (typeof registeredGenerators)[number];

/**
 * The shard a generator is swept in: FNV-1a over its id. Depends on the id
 * alone, so a generator stays in one shard however the library grows.
 */
export function shardOf(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % SWEEP_SHARDS;
}

/** The generators one shard sweeps, in registry order. */
export function generatorsInShard(shard: number): RegisteredGenerator[] {
  return registeredGenerators.filter((generator) => shardOf(generator.id) === shard);
}

/** The shard number a sweep file's name or URL carries, or undefined for any other file. */
export function shardIndexOf(file: string): number | undefined {
  const match = /(?:^|\/)generators\.sweep-(\d+)\.test\.ts$/.exec(file);
  return match ? Number(match[1]) : undefined;
}

/**
 * Registers the sweep for the shard the calling file is named for. Called as
 * `sweepShard(import.meta.url)` and nothing else, so the file name is the only
 * place a shard's number is written.
 */
export function sweepShard(fileUrl: string): void {
  const shard = shardIndexOf(fileUrl);
  if (shard === undefined || shard >= SWEEP_SHARDS) {
    throw new Error(`${fileUrl} is not generators.sweep-NN.test.ts for a shard below ${SWEEP_SHARDS}`);
  }
  describe.each(generatorsInShard(shard).map((g) => [g.id, g] as const))('%s', sweepGenerator);
}

// Derived choice generators are swept exactly like the ones written by hand:
// they are what a lesson actually asks, so "derived" is no reason to trust them.
function sweepGenerator(_id: string, generator: RegisteredGenerator): void {
  // Drawn by the first test that reads them and dropped once this generator's
  // tests are done. Drawing every generator's cases when the file was
  // collected held them all for the whole run, gigabytes across the registry.
  // The draws are the same either way: each is fixed by its seed and difficulty.
  let sampled: { params: unknown; difficulty: number; seed: number }[] | undefined;
  const cases = () =>
    (sampled ??= DIFFICULTIES.flatMap((difficulty) =>
      Array.from({ length: SEEDS }, (_, seed) => {
        const params = (generator as Generator<unknown>).sample(makeRng(seed), difficulty);
        return { params, difficulty, seed };
      }),
    ));
  afterAll(() => {
    sampled = undefined;
  });

  it('renders a well-formed slide for every seed', () => {
    for (const { params } of cases()) {
      const slide = (generator as Generator<unknown>).render(params);

      // A bank offers a tile no more often than the answer can use it. Two
      // distractor formulas landing on the same value, or on the answer,
      // showed one tile twice, which reads as a hint that it is needed twice.
      // Signs are exempt: a sign table offers two of each so the count of
      // tiles cannot give the answer away.
      if ('bank' in slide && Array.isArray(slide.bank) && Array.isArray(slide.answer)) {
        const needed = new Map<string, number>();
        for (const token of slide.answer as string[]) needed.set(token, (needed.get(token) ?? 0) + 1);
        const offered = new Map<string, number>();
        for (const token of slide.bank as string[]) offered.set(token, (offered.get(token) ?? 0) + 1);
        const surplus = [...offered].filter(
          ([token, n]) => !SIGN_TILES.has(token) && n > Math.max(1, needed.get(token) ?? 0),
        );
        expect(surplus, `${generator.id}: repeated tiles in ${JSON.stringify(slide.bank)}`).toEqual([]);
      }

      if (slide.kind === 'choice') {
        expect(slide.options.length).toBeGreaterThanOrEqual(2);
        const ids = slide.options.map((o) => o.id);
        expect(ids).toContain(slide.correctId);
        // Duplicate options would let a learner pick "the right one" twice.
        expect(new Set(ids).size).toBe(ids.length);
        // And the *labels* must differ too, which the ids cannot tell you.
        // Distractors computed arithmetically collide: a split integral whose
        // two parts are -2 and 2 has `first - second` equal to
        // `first * second`, and the slide then offers the same number twice
        // under two different ids. Found exactly that way.
        const labels = slide.options.map((o) => o.label);
        expect(
          new Set(labels).size,
          `duplicate option label in ${labels.join(' | ')}`,
        ).toBe(labels.length);
      }

      if (slide.kind === 'tiles') {
        expect(slide.answer.length).toBeGreaterThan(0);
        // Every token the answer needs must actually be on offer.
        const bank = [...slide.bank];
        for (const token of slide.answer) {
          const at = bank.indexOf(token);
          expect(at, `token ${token} missing from bank`).toBeGreaterThanOrEqual(0);
          bank.splice(at, 1);
        }
        // A bank with nothing left over is the answer with no wrong option to place.
        expect(
          bank.length,
          `bank for answer ${JSON.stringify(slide.answer)} has no real distractor left over`,
        ).toBeGreaterThanOrEqual(1);
        // Tiles are graded by exact string, but TeX ignores spaces: `- 8` and
        // `-8` draw the same "−8", so a bank holding both shows two identical
        // tiles of which only one is marked right. Spell every tile one way.
        expect(
          lookalikeTiles(slide.bank),
          `${generator.id}: tiles that look the same in ${JSON.stringify(slide.bank)}`,
        ).toEqual([]);
      }

      if (slide.kind === 'table') {
        // One answer token per blank, or the widget's reading order and the
        // answer disagree about which value belongs where.
        const blanks = slide.rows.flat().filter((cell) => cell === null).length;
        expect(slide.answer.length, 'one answer token per blank').toBe(blanks);
        for (const row of slide.rows) {
          expect(row.length, 'a row is not as wide as the header').toBe(slide.columns.length);
        }
        // Every token the answer needs must be on offer, as often as it is needed.
        const bank = [...slide.bank];
        for (const token of slide.answer) {
          const at = bank.indexOf(token);
          expect(at, `table value ${token} missing from bank`).toBeGreaterThanOrEqual(0);
          bank.splice(at, 1);
        }
        // Two spares at least, as for a tree: with one, the last blank is
        // filled by elimination rather than by working the rule.
        expect(
          bank.length,
          `table bank for ${JSON.stringify(slide.answer)} keeps only ${bank.length} distractor(s)`,
        ).toBeGreaterThanOrEqual(2);
      }

      if (slide.kind === 'evaluate') {
        // Exactly one option right, and every option a whole number: a
        // near-miss the learner cannot tell apart from the answer by shape is
        // the only kind worth offering.
        const value = valueOf(slide.expr);
        expect(Number.isInteger(value), `value ${value} is not whole`).toBe(true);
        expect(slide.options.length, 'too few options').toBeGreaterThanOrEqual(3);
        expect(new Set(slide.options).size, 'options repeat').toBe(slide.options.length);
        const right = slide.options.filter((option) => Number(option) === value);
        expect(right.length, `options must hold exactly one ${value}`).toBe(1);
        for (const option of slide.options) {
          expect(Number.isInteger(Number(option)), `option ${option} is not whole`).toBe(true);
        }
      }

      if (slide.kind === 'reduce') {
        // Every node the learner can tap needs a bank, including the operators
        // they may take too early — a wrong turn with nothing to choose from is
        // a dead end, and the whole point is that it produces a believable line.
        const walk = (node: Expr, path: string): void => {
          if (node.kind === 'num') return;
          const bank = slide.banks[path];
          expect(bank, `no bank for ${path}`).toBeDefined();
          expect(bank.length, `bank for ${path} is too small`).toBeGreaterThanOrEqual(4);
          expect(new Set(bank).size, `bank for ${path} repeats a value`).toBe(bank.length);
          expect(bank, `bank for ${path} omits its own value`).toContain(String(valueOf(node)));
          if (node.kind === 'binary') {
            walk(node.left, `${path}.l`);
            walk(node.right, `${path}.r`);
          } else if (node.kind === 'power') {
            walk(node.base, `${path}.b`);
            walk(node.exponent, `${path}.e`);
          } else if (node.kind === 'log') {
            walk(node.base, `${path}.g`);
            walk(node.arg, `${path}.v`);
          } else {
            // A root or a trig node: one child, reached by `a`.
            walk(node.arg, `${path}.a`);
          }
        };
        walk(slide.expr, 'r');

        // The slide has to be finishable by tapping. Every legal target must
        // also be a handle on some rendered fragment, or the learner is looking
        // at the piece that comes next with no way to choose it — which is what
        // happened to a power nested inside a logarithm, where the whole log
        // rendered as one untappable fragment.
        let live = slide.expr;
        for (let taps = 0; live.kind !== 'num'; taps += 1) {
          expect(taps, 'reduce slide does not finish').toBeLessThan(12);
          const handles = new Set(
            renderExpr(live)
              .map((fragment) => fragment.handle)
              .filter((handle): handle is string => handle !== undefined),
          );
          // A pair is offered on its operator's handle, as the widget reads it.
          const next = targets(live).find(
            (target) =>
              target.legal &&
              handles.has(isPairPath(target.path) ? pairOwner(target.path) : target.path),
          );
          expect(next, `nothing legal is tappable in ${toTex(live)}`).toBeDefined();
          const node = targetAt(live, next!.path);
          live = reduceAt(live, next!.path, valueOf(node!));
        }

        // Every value in the expression and every bank entry must be a whole
        // number: a stray third of a unit turns an order question into an
        // arithmetic-with-fractions question, which is a different lesson.
        for (const bank of Object.values(slide.banks)) {
          for (const value of bank) {
            expect(Number.isInteger(Number(value)), `bank value ${value} is not whole`).toBe(true);
          }
        }
      }

      if (slide.kind === 'steps') {
        for (const [i, reduction] of slide.reductions.entries()) {
          const correctOp = reduction.operator ?? reduction.span[0];
          const seen = new Set([correctOp]);
          for (const decoy of reduction.decoys ?? []) {
            // A decoy collapses for real when chosen, so it has to leave the
            // line the same length the correct span would. Otherwise every
            // later span is off by the difference and the working falls apart
            // in a way no learner could recover from.
            const width = reduction.span[1] - reduction.span[0];
            expect(
              decoy.span[1] - decoy.span[0],
              `reduction ${i}: decoy ${decoy.span} covers a different number of tokens from ${reduction.span}`,
            ).toBe(width);
            // Two choices on the same token would draw one button and silently
            // lose the other.
            expect(seen.has(decoy.operator), `reduction ${i}: two choices tap token ${decoy.operator}`).toBe(false);
            seen.add(decoy.operator);
            expect(decoy.operator).toBeGreaterThanOrEqual(decoy.span[0]);
            expect(decoy.operator).toBeLessThan(decoy.span[1]);
          }
          // The bank has to hold what the wrong turn produces as well as the
          // right one, or picking the decoy leaves nothing sensible to choose.
          expect(reduction.bank).toContain(reduction.value);
        }
      }

      if (slide.kind === 'flow') {
        // Every branch goes exactly one place: on to another step, or to an
        // outcome. A branch with both would make the path ambiguous; one with
        // neither is a dead end the learner cannot leave.
        const ids = new Set(slide.steps.map((step) => step.id));
        expect(slide.steps.length, 'a flow needs at least one fork').toBeGreaterThan(0);
        for (const step of slide.steps) {
          expect(step.branches.length, `${step.id}: a fork needs two ways out`).toBeGreaterThan(1);
          const labels = step.branches.map((branch) => branch.label);
          expect(new Set(labels).size, `${step.id}: duplicate branch label`).toBe(labels.length);
          for (const branch of step.branches) {
            const onward = branch.to !== undefined;
            const ends = branch.outcome !== undefined;
            expect(onward !== ends, `${step.id}/${branch.label}: needs exactly one of to/outcome`).toBe(true);
            if (onward) expect(ids.has(branch.to!), `${step.id}: no step ${branch.to}`).toBe(true);
          }
        }

        // Walking the stated answer must actually reach an outcome. An answer
        // naming a label that is not on offer at that fork would be unreachable
        // by any amount of tapping, and the slide unanswerable.
        type FlowStep = (typeof slide.steps)[number];
        type FlowBranch = FlowStep['branches'][number];
        const byId = (id: string | undefined): FlowStep | undefined =>
          slide.steps.find((candidate) => candidate.id === id);

        let step: FlowStep | undefined = slide.steps[0];
        let reached = false;
        for (const label of slide.answer) {
          expect(step, 'answer runs past the end of the tree').toBeDefined();
          const branch: FlowBranch | undefined = step!.branches.find((b) => b.label === label);
          expect(branch, `${step!.id}: answer picks a branch that is not offered: ${label}`).toBeDefined();
          if (branch!.outcome !== undefined) {
            reached = true;
            step = undefined;
          } else {
            step = byId(branch!.to);
          }
        }
        expect(reached, 'the stated answer does not reach an outcome').toBe(true);
      }

      if (slide.kind === 'slider') {
        // A slider whose answer sits between two steps cannot be reached by
        // dragging, so it is unanswerable rather than hard.
        expect(slide.min).toBeLessThan(slide.max);
        expect(slide.step).toBeGreaterThan(0);
        expect(slide.answer).toBeGreaterThanOrEqual(slide.min);
        expect(slide.answer).toBeLessThanOrEqual(slide.max);
        const steps = (slide.answer - slide.min) / slide.step;
        expect(Math.abs(steps - Math.round(steps)), `answer ${slide.answer} is off-step`).toBeLessThan(1e-9);
        expect(slide.readout).toContain('{v}');
      }

      if (slide.kind === 'transform') {
        const target = parseTransform(slide.answer);
        expect(target, `unreadable answer ${slide.answer}`).toBeDefined();
        // Written the way the widget writes it, so a learner who builds the
        // same parameters sends the same string.
        expect(encodeTransform(target!)).toBe(slide.answer);
        // Every part of it has to be something the controls can reach: whole
        // shifts inside the steppers' range, factors on the ladder.
        expect(reachable(target!), `${slide.answer} is out of the controls' reach`).toBe(true);
        // The live curve starts at the identity, so a target that *is* the
        // identity would be marked right for a learner who touched nothing
        // but a stepper and back — the slider's old trap, on a new widget.
        expect(
          sameCurve(slide.base, IDENTITY, target!, slide.window),
          `${slide.base} ${slide.answer} draws the untouched curve`,
        ).toBe(false);
        // A target that has left the picture cannot be matched: across a comb
        // of 49 points, a tenth must be defined and inside the window.
        const f = transformed(slide.base, target!);
        const { xMin, xMax, yMin, yMax } = slide.window;
        const inView = Array.from({ length: 49 }, (_, i) => xMin + ((xMax - xMin) * i) / 48).filter((x) => {
          const y = f(x);
          return Number.isFinite(y) && y >= yMin && y <= yMax;
        });
        expect(inView.length, `${slide.base} ${slide.answer} is mostly off screen`).toBeGreaterThanOrEqual(5);
      }

      if (slide.kind === 'numberLine') {
        // Every tick is a tap target as wide as the spacing, so the step count
        // is what keeps them a thumb apart on a phone: twelve across the line
        // is the most that fits. Fewer than four is barely a line at all.
        expect(slide.step).toBeGreaterThan(0);
        const ticks = (slide.max - slide.min) / slide.step;
        expect(Math.abs(ticks - Math.round(ticks)), 'window is off the step lattice').toBeLessThan(1e-9);
        expect(ticks, `${ticks} steps will not fit a phone`).toBeLessThanOrEqual(12);
        expect(ticks).toBeGreaterThanOrEqual(4);
        // The answer is stored canonically, so the grade compares like with
        // like, and holds at least one piece — an empty set cannot be drawn,
        // since Check waits for something shaded.
        const pieces = parseSet(slide.answer);
        expect(pieces, `unreadable set ${slide.answer}`).toBeDefined();
        expect(pieces!.length, `empty set ${slide.answer}`).toBeGreaterThan(0);
        expect(canonicalSet(slide.answer), 'answer is not canonical').toBe(slide.answer);
        // Every end sits on a tick strictly inside the window: on the edge, a
        // ray would have nowhere to run and an open end nothing beside it.
        for (const piece of pieces!) {
          for (const end of [piece.lo, piece.hi].filter(Number.isFinite)) {
            expect(end, `end ${end} outside ${slide.min}..${slide.max}`).toBeGreaterThan(slide.min);
            expect(end, `end ${end} outside ${slide.min}..${slide.max}`).toBeLessThan(slide.max);
            const at = (end - slide.min) / slide.step;
            expect(Math.abs(at - Math.round(at)), `end ${end} is off a tick`).toBeLessThan(1e-9);
          }
        }
      }

      if (slide.kind === 'forces') {
        // An arrow's id is its direction, so two arrows one way would be one
        // tap target for two answers; and every head must be a thumb apart.
        const ids = slide.arrows.map((arrow) => arrow.id);
        expect(new Set(ids).size, `two arrows share a direction in ${ids.join(' ')}`).toBe(ids.length);
        expect(headsClash(slide.scene, ids), 'arrow heads overlap').toEqual([]);
        if (slide.mode === 'pick') {
          // Stored canonically, naming only arrows on the diagram, with at
          // least one arrow that does not act: otherwise tapping everything
          // is the answer and nothing is being judged.
          expect(canonicalForces(slide.answer), 'answer is not canonical').toBe(slide.answer);
          const acting = slide.answer.split('|');
          expect(acting.length, 'no force acts').toBeGreaterThan(0);
          for (const id of acting) expect(ids, `answer names ${id}, not on the diagram`).toContain(id);
          expect(ids.length, 'pick has no distractor arrow').toBeGreaterThan(acting.length);
        } else {
          // One token per blank, every token on offer as often as it is
          // needed, and two spares at least, as for a tree.
          const blanks = slide.arrows.filter((arrow) => arrow.given === undefined).length;
          expect(slide.answer.length, 'one answer token per blank').toBe(blanks);
          const bank = [...slide.bank];
          for (const token of slide.answer) {
            const at = bank.indexOf(token);
            expect(at, `force value ${token} missing from bank`).toBeGreaterThanOrEqual(0);
            bank.splice(at, 1);
          }
          expect(
            bank.length,
            `forces bank for ${JSON.stringify(slide.answer)} keeps only ${bank.length} distractor(s)`,
          ).toBeGreaterThanOrEqual(2);
          expect(
            lookalikeTiles(slide.bank),
            `${generator.id}: tiles that look the same in ${JSON.stringify(slide.bank)}`,
          ).toEqual([]);
        }
      }

      if (slide.kind === 'plot') {
        expect(Number.isInteger(slide.answer.re)).toBe(true);
        expect(Number.isInteger(slide.answer.im)).toBe(true);
        // The target must be reachable on the grid the widget draws.
        expect(Math.abs(slide.answer.re)).toBeLessThanOrEqual(slide.range);
        expect(Math.abs(slide.answer.im)).toBeLessThanOrEqual(slide.range);
      }

      if (slide.kind === 'expression') {
        expect(parseExpression(slide.answer).ok, `unparseable answer: ${slide.answer}`).toBe(true);
        expect(slide.lead).toBeTruthy();
      }

      if (slide.kind === 'steps') {
        // Replay the reductions the way the widget does. A span that runs off
        // the end of the line, or a bank missing its own answer, is a question
        // that cannot be finished — and it would only show up mid-lesson.
        let line = slide.start;
        expect(slide.reductions.length).toBeGreaterThan(0);
        for (const [idx, step] of slide.reductions.entries()) {
          const [from, to] = step.span;
          expect(from, `step ${idx} span start`).toBeGreaterThanOrEqual(0);
          expect(to, `step ${idx} span end`).toBeGreaterThan(from);
          expect(to, `step ${idx} span past end of line`).toBeLessThanOrEqual(line.length);
          expect(step.bank, `step ${idx} bank lacks its own value`).toContain(step.value);
          // Distractors only help if they are distinct from each other.
          expect(new Set(step.bank).size).toBe(step.bank.length);
          line = [...line.slice(0, from), step.value, ...line.slice(to)];
        }
        // Reducing everything should end with a single value, not a fragment.
        expect(line.length, 'working does not reduce to one term').toBe(1);
      }

      if (slide.kind === 'tree') {
        expect(slide.answer.length).toBe(slide.nodes.length);
        const seen = new Set<string>();
        for (const node of slide.nodes) {
          // Evaluation order, so the layout can be derived in one pass.
          for (const id of node.from) {
            expect(seen.has(id), `node ${node.id} feeds from later node ${id}`).toBe(true);
          }
          seen.add(node.id);
        }
        const bank = [...slide.bank];
        for (const value of slide.answer) {
          const at = bank.indexOf(value);
          expect(at, `value ${value} missing from bank`).toBeGreaterThanOrEqual(0);
          bank.splice(at, 1);
        }
        // A bank that is the answer and one spare is not a question — with
        // three slots and four tiles a learner can place the odd one out
        // without doing any of the arithmetic. Distractors are built from the
        // question's own numbers, so they collide with the answer far more
        // often than they look like they will: a vector sum whose components
        // happened to match dropped three of its four distractors and shipped
        // with exactly one.
        expect(
          bank.length,
          `tree bank for ${JSON.stringify(slide.answer)} keeps only ${bank.length} distractor(s)`,
        ).toBeGreaterThanOrEqual(2);
      }

      if (slide.kind === 'iterate') {
        // Graded as exact tokens, so each one has to be written to exactly
        // the places the prompt asks for: a row the learner computes right
        // and writes to the stated precision must be a tile they can find.
        const prose = slide.prompt
          .map((block) => (block.kind === 'prose' ? block.text : ''))
          .join(' ');
        const stated = /to (\d) decimal places/.exec(prose);
        expect(stated, `iterate prompt states no precision: ${prose}`).not.toBeNull();
        const places = Number(stated![1]);
        const written = new RegExp(`^-?\\d+\\.\\d{${places}}$`);
        expect(slide.answer.length, 'an iteration needs rows and a conclusion').toBeGreaterThanOrEqual(3);
        for (const token of slide.answer.slice(0, -1)) {
          expect(token, `row ${token} is not written to ${places} places`).toMatch(written);
        }
        const conclusion = slide.answer[slide.answer.length - 1];
        expect(conclusion).toMatch(
          slide.conclusion === 'limit' ? written : /^-?\d+\.\d < \\alpha < -?\d+\.\d$/,
        );

        const bank = [...slide.bank];
        for (const value of slide.answer) {
          const at = bank.indexOf(value);
          expect(at, `value ${value} missing from bank`).toBeGreaterThanOrEqual(0);
          bank.splice(at, 1);
        }
        expect(
          bank.length,
          `iterate bank for ${JSON.stringify(slide.answer)} keeps only ${bank.length} distractor(s)`,
        ).toBeGreaterThanOrEqual(2);
      }

      if (slide.kind === 'probTree' || slide.kind === 'venn') {
        // Shared by both: blanks filled from a bank and graded as exact
        // tokens. One token per blank; the bank holds each as often as the
        // answer needs it and at least two spares; sorted by value, never
        // shuffled; and no value offered under two spellings, since
        // `\frac{1}{2}` and `0.5` are different tokens and one would be
        // marked wrong for being right.
        const values =
          slide.kind === 'venn'
            ? slide.regions
            : slide.branches.flatMap((branch) => [branch.p, ...branch.next.map((under) => under.p)]);
        const blanks = values.filter((value) => value === null).length;
        expect(slide.answer.length, 'one answer token per blank').toBe(
          slide.kind === 'probTree' && slide.mode === 'path' ? 2 : blanks,
        );
        const bank = [...slide.bank];
        for (const token of slide.kind === 'probTree' && slide.mode === 'path' ? [] : slide.answer) {
          const at = bank.indexOf(token);
          expect(at, `${slide.kind} value ${token} missing from bank`).toBeGreaterThanOrEqual(0);
          bank.splice(at, 1);
        }
        if (slide.bank.length > 0) {
          expect(
            bank.length,
            `${slide.kind} bank for ${JSON.stringify(slide.answer)} keeps only ${bank.length} distractor(s)`,
          ).toBeGreaterThanOrEqual(2);
          const sorted = [...slide.bank].sort(
            (a, b) => tokenValue(a)! - tokenValue(b)! || a.localeCompare(b),
          );
          expect(slide.bank, `${slide.kind} bank is not sorted by value`).toEqual(sorted);
          for (const a of slide.bank) {
            expect(tokenValue(a), `${slide.kind} bank token ${a} is not a value`).toBeDefined();
            for (const b of slide.bank) {
              if (a !== b) {
                expect(
                  Math.abs(tokenValue(a)! - tokenValue(b)!),
                  `${a} and ${b} are one value spelled two ways`,
                ).toBeGreaterThan(1e-9);
              }
            }
          }
        }
      }

      if (slide.kind === 'probTree') {
        // Two stages, at most three first-stage branches and two under each,
        // labels unique among siblings. Given plus answer, the branches from
        // every point sum to 1: a tree that does not is not a tree.
        expect(slide.branches.length).toBeGreaterThanOrEqual(2);
        expect(slide.branches.length).toBeLessThanOrEqual(3);
        const unique = (labels: string[]) => new Set(labels).size === labels.length;
        expect(unique(slide.branches.map((b) => b.label)), 'first-stage labels repeat').toBe(true);
        for (const branch of slide.branches) {
          expect(branch.next).toHaveLength(2);
          expect(unique(branch.next.map((b) => b.label)), `labels under ${branch.label} repeat`).toBe(true);
        }
        const answers = [...slide.answer];
        const probAt = (p: string | null) => {
          const token = p ?? answers.shift()!;
          const value = tokenValue(token);
          expect(value, `branch value ${token} is not a probability`).toBeDefined();
          expect(value!).toBeGreaterThan(0);
          expect(value!).toBeLessThan(1);
          return value!;
        };
        if (slide.mode === 'path') {
          expect(slide.bank, 'a path question has no bank').toEqual([]);
          const [top, under] = slide.answer;
          const branch = slide.branches.find((b) => b.label === top);
          expect(branch, `path starts at ${top}, which is no first-stage branch`).toBeDefined();
          expect(
            branch!.next.map((b) => b.label),
            `path goes on to ${under}, which is not under ${top}`,
          ).toContain(under);
        }
        // Blanks are read first stage then second, the order `answer` lists them.
        const first = slide.branches.map((branch) => probAt(branch.p));
        const groups = [first, ...slide.branches.map((branch) => branch.next.map((b) => probAt(b.p)))];
        for (const group of groups) {
          expect(
            group.reduce((total, value) => total + value, 0),
            `branches ${JSON.stringify(slide.branches)} with ${JSON.stringify(slide.answer)}`,
          ).toBeCloseTo(1, 9);
        }
      }

      if (slide.kind === 'venn') {
        // Four regions, given plus answer: whole counts adding to the total
        // in the corner, or probabilities adding to 1.
        expect(slide.regions).toHaveLength(4);
        const answers = [...slide.answer];
        const regions = slide.regions.map((given) => tokenValue(given ?? answers.shift()!)!);
        const total = regions.reduce((sum, value) => sum + value, 0);
        if (slide.total !== undefined) {
          for (const value of regions) expect(Number.isInteger(value), `region ${value}`).toBe(true);
          expect(total, `regions ${regions.join(', ')}`).toBe(slide.total);
        } else {
          for (const value of regions) expect(value).toBeGreaterThan(0);
          expect(total, `regions ${regions.join(', ')}`).toBeCloseTo(1, 9);
        }
      }

      if (slide.kind === 'order') {
        // Every step of the proof has to be in the bank exactly once, or the
        // slots cannot be filled; and at least one step has to be a
        // distractor, or ordering is all there is and nothing is being judged.
        const ids = slide.steps.map((step) => step.id);
        expect(new Set(ids).size, 'order bank repeats an id').toBe(ids.length);
        const texts = slide.steps.map((step) => step.text.trim());
        expect(new Set(texts).size, 'two order steps read the same').toBe(texts.length);
        expect(texts.every((text) => text !== ''), 'an order step is blank').toBe(true);
        expect(slide.answer.length).toBeGreaterThanOrEqual(2);
        expect(new Set(slide.answer).size, 'order answer repeats a step').toBe(slide.answer.length);
        for (const id of slide.answer) {
          expect(ids, `order answer ${id} missing from bank`).toContain(id);
        }
        expect(ids.length - slide.answer.length, 'order bank has no distractor').toBeGreaterThanOrEqual(1);
        // The bank must not read as the proof: its answer steps, in bank
        // order, may not already be in answer order.
        const positions = slide.answer.map((id) => ids.indexOf(id));
        expect(
          positions.every((at, idx) => idx === 0 || at > positions[idx - 1]),
          'order bank lists the proof in order',
        ).toBe(false);
      }
    }
  });

  it('renders every piece of TeX it emits', () => {
    // The course-integrity sweep in generators.test.ts checks authored TeX on literal slides.
    // Nothing checked *generated* TeX until now, and one slide kind is
    // genuinely fragile: a tiles template is split into independent fragments,
    // one per literal segment between the blanks, and each is rendered alone.
    // A \begin{pmatrix} opening before a blank and closing after it is two
    // invalid fragments — and the Tex component runs with throwOnError: false,
    // so the learner sees red error text mid-lesson rather than a crash.
    //
    // Rendered the way the app renders it: lenient about strictness, strict
    // about validity, which is exactly the line between "looks fine" and
    // "shows an error to the learner".
    const check = (tex: string, where: string) => {
      expect(
        () => katex.renderToString(tex, { throwOnError: true, strict: false }),
        `${where}: ${tex}`,
      ).not.toThrow();
      expect(BARE_TEX_COMMAND.test(tex), `${where}: bare TeX command in ${tex}`).toBe(false);
    };

    for (const { params } of cases()) {
      const slide = (generator as Generator<unknown>).render(params);

      if (slide.kind !== 'teach') {
        for (const block of slide.prompt) {
          if (block.kind === 'display') check(block.tex, 'prompt display');
          if (block.kind === 'prose') {
            block.text
              .split(/\$([^$]+)\$/g)
              .filter((_, idx) => idx % 2 === 1)
              .forEach((tex) => check(tex, 'prompt inline'));
          }
        }
      }

      if (slide.kind === 'expression' && slide.lead) check(slide.lead, 'lead');

      // Three kinds arrived after this sweep was written, and every string
      // below reaches the learner: a branch label, an option, a bank value or
      // the line of working itself.
      if (slide.kind === 'flow') {
        check(slide.subject, 'flow subject');
        const inline = (text: string, where: string) =>
          text
            .split(/\$([^$]+)\$/g)
            .filter((_, idx) => idx % 2 === 1)
            .forEach((tex) => check(tex, where));
        for (const step of slide.steps) {
          inline(step.ask, `flow ${step.id} ask`);
          for (const branch of step.branches) {
            inline(branch.label, `flow ${step.id} label`);
            if (branch.outcome) inline(branch.outcome, `flow ${step.id} outcome`);
          }
        }
      }

      if (slide.kind === 'evaluate') {
        // Rendered the way the widget renders it: one whole string, since
        // nothing on this slide is tappable and it needs no fragments.
        check(toTex(slide.expr), 'evaluate expression');
        for (const option of slide.options) check(option, 'evaluate option');
      }

      if (slide.kind === 'reduce') {
        for (const fragment of renderExpr(slide.expr)) check(fragment.tex, 'reduce fragment');
        for (const [path, bank] of Object.entries(slide.banks)) {
          for (const value of bank) check(value, `reduce bank ${path}`);
        }
      }

      if (slide.kind === 'choice') {
        for (const option of slide.options) {
          if (option.tex) check(option.label, 'option');
        }
      }

      if (slide.kind === 'tiles') {
        // Even indices are the literal TeX between the blanks.
        slide.template
          .split(/\{(\d+)\}/g)
          .filter((_, idx) => idx % 2 === 0)
          .filter((segment) => segment.trim() !== '')
          .forEach((segment) => check(segment, 'template fragment'));
        for (const token of slide.bank) check(token, 'tile');
      }

      if (slide.kind === 'steps') {
        for (const token of slide.start) check(token, 'step token');
        for (const step of slide.reductions) {
          for (const token of step.bank) check(token, 'step bank');
        }
      }

      if (slide.kind === 'tree') {
        check(slide.expression, 'tree expression');
        for (const token of slide.bank) check(token, 'tree bank');
      }

      if (slide.kind === 'table') {
        // Every header, given cell and bank value is its own KaTeX call.
        for (const header of slide.columns) check(header, 'table header');
        for (const cell of slide.rows.flat()) if (cell) check(cell, 'table cell');
        for (const token of slide.bank) check(token, 'table bank');
      }

      if (slide.kind === 'transform') {
        // The readout: what the learner builds, starting from the identity.
        const target = parseTransform(slide.answer);
        if (target) check(transformTex(target), 'transform readout');
        check(transformTex(IDENTITY), 'transform readout');
      }

      if (slide.kind === 'forces') {
        // Each label is laid over the picture as its own KaTeX call, and so
        // is every given magnitude and bank token beneath it.
        for (const arrow of slide.arrows) {
          check(arrow.label, 'force label');
          if (arrow.given !== undefined) check(arrow.given, 'force given');
        }
        if (slide.mode === 'fill') for (const token of slide.bank) check(token, 'force bank');
      }

      if (slide.kind === 'iterate') {
        check(slide.start, 'iterate start');
        for (const token of slide.bank) check(token, 'iterate bank');
      }

      if (slide.kind === 'probTree') {
        // Every label and value is its own KaTeX call over the drawing.
        for (const branch of slide.branches) {
          check(branch.label, 'tree label');
          if (branch.p) check(branch.p, 'tree probability');
          for (const under of branch.next) {
            check(under.label, 'tree label');
            if (under.p) check(under.p, 'tree probability');
          }
        }
        for (const token of slide.bank) check(token, 'tree bank');
        for (const token of slide.answer) check(token, 'tree answer');
      }

      if (slide.kind === 'venn') {
        for (const set of slide.sets) check(set, 'venn set');
        check(slide.total === undefined ? '\\xi' : `n(\\xi) = ${slide.total}`, 'venn corner');
        for (const region of slide.regions) if (region) check(region, 'venn region');
        for (const token of slide.bank) check(token, 'venn bank');
      }

      if (slide.kind === 'order') {
        // Each step is prose rendered the way a prose block is, so it is the
        // inline maths between its dollar signs that reaches KaTeX. An odd
        // number of dollars leaves a stray one printed as text.
        for (const step of slide.steps) {
          expect((step.text.match(/\$/g) ?? []).length % 2, `unbalanced $ in ${step.text}`).toBe(0);
          step.text
            .split(/\$([^$]+)\$/g)
            .filter((_, idx) => idx % 2 === 1)
            .forEach((tex) => check(tex, `order step ${step.id}`));
        }
      }
    }
  });

  it('renders every line of its worked solution', () => {
    // The sweep above reads the question; nothing read the answer's working,
    // which the learner sees under Show me. `int-vol-find-limit` glued \pi to
    // the letter after it, and `25\pih` is an unknown command, so the line
    // printed red in more than half its draws with a green suite.
    //
    // Thirty seeds a difficulty rather than all of `cases`: a solution is
    // several KaTeX calls, across every generator in the registry, and a
    // family of draws that fails at all fails well inside thirty.
    const solutionSeeds = 30;
    const failures: string[] = [];
    const check = (tex: string, where: string) => {
      try {
        katex.renderToString(tex, { throwOnError: true, strict: false });
      } catch (error) {
        failures.push(`${where}: ${tex} (${(error as Error).message.split('\n')[0]})`);
        return;
      }
      if (BARE_TEX_COMMAND.test(tex)) failures.push(`${where}: bare TeX command in ${tex}`);
    };

    for (const { params, difficulty, seed } of cases()) {
      if (seed >= solutionSeeds) continue;
      const steps = (generator as Generator<unknown>).solution(params);
      steps.forEach((step, line) => {
        const where = `seed ${seed}, difficulty ${difficulty}, line ${line + 1}`;
        if (step.tex) check(step.tex, where);
        if (step.text) {
          // Prose rendered as the app renders it: inline maths between dollars.
          if ((step.text.match(/\$/g) ?? []).length % 2 !== 0) {
            failures.push(`${where}: unbalanced $ in ${step.text}`);
          }
          step.text
            .split(/\$([^$]+)\$/g)
            .filter((_, idx) => idx % 2 === 1)
            .forEach((tex) => check(tex, where));
        }
      });
    }
    expect(failures.slice(0, 5).join('\n')).toBe('');
  });

  it('offers exactly one correct option, and distractors that are really wrong', () => {
    // The multiple-choice form of a generator. A distractor that is silently
    // equal to the answer makes a question with two right answers, and only the
    // checker can tell — the two are written differently by construction, so
    // comparing the strings proves nothing.
    const base = generator as Generator<unknown>;
    if (!base.choices) return;

    for (const { params, seed } of cases()) {
      const options = base.choices(params);
      expect(options.length, 'a choice needs at least two options').toBeGreaterThanOrEqual(2);

      const correct = options.filter((o) => o.correct);
      expect(correct.length, `seed ${seed}: exactly one option must be correct`).toBe(1);

      const labels = options.map((o) => o.tex);
      expect(new Set(labels).size, `seed ${seed}: ${labels.join(' | ')}`).toBe(labels.length);

      const right = correct[0].answer;
      if (!right) continue;
      for (const option of options) {
        if (option.correct || !option.answer) continue;
        const verdict = checkAnswer(option.answer, right, { seed });
        expect(
          verdict.status,
          `seed ${seed}: distractor ${option.tex} (${option.answer}) is not wrong against ${right}`,
        ).toBe('incorrect');
      }
    }
  });

  it('offers choice options that differ in value, with no second right answer', () => {
    // The test above needs a generator's own `choices()`, and every choice
    // slide written directly as a `choice` skipped it: the sweep proved the
    // right id was offered and nothing about the others. `vec-parallel`
    // offered a second parallel vector that way. So every choice slide whose
    // labels read as values (`optionValue.ts`) is compared by value: no
    // distractor may equal the right option, which would mark a right pick
    // wrong, and no two distractors may equal each other, which hands the
    // learner a free elimination. Labels that are words, sets or anything
    // else the reader declines are left alone.
    const exempt = SAME_VALUE_BY_DESIGN[_id];
    for (const { params, difficulty, seed } of cases()) {
      const slide = (generator as Generator<unknown>).render(params);
      if (slide.kind !== 'choice') continue;
      const labels = slide.options.map((option) => option.label);
      const values = slideValues(labels);
      if (!values) continue;
      const right = slide.options.findIndex((option) => option.id === slide.correctId);
      for (const [a, b] of equalPairs(values, seed)) {
        const secondRight = a === right || b === right;
        if (exempt && (exempt.rule === 'form' || !secondRight)) continue;
        expect.fail(
          `seed ${seed} d${difficulty}: ${secondRight ? 'a distractor equals the right option' : 'two distractors are equal'}: ` +
            `${labels[a]} and ${labels[b]} (right: ${labels[right]})`,
        );
      }
    }
  });

  it('never puts $-delimited maths in a plain-text choice label', () => {
    // A choice option is either all TeX (`tex: true`) or plain text, and the
    // plain branch renders its label as a string. "$D$ falls by 24 mg" then
    // reaches the learner with the dollar signs showing, which is how the
    // first draft of expm-rate-words looked in the browser.
    for (const { params, seed } of cases()) {
      const slide = (generator as Generator<unknown>).render(params);
      if (slide.kind !== 'choice') continue;
      for (const option of slide.options) {
        if (option.tex) continue;
        expect(option.label, `seed ${seed}: plain label shows raw $ signs`).not.toContain('$');
      }
    }
  });

  it('never shows a bare single-letter or word-only display in a derived choice prompt', () => {
    // promptFrom lifts an expression slide's lead, minus its trailing "=",
    // into a display block. A lead like "x =" strips down to a bare "x" —
    // meaningless above four options that already read "x = ...". A lead like
    // "\text{value} =" strips down to the word "value" floating above them.
    if (!_id.endsWith(CHOICE_SUFFIX)) return;
    const g = generator as Generator<unknown>;
    const slide = g.render(g.sample(makeRng(1), 1));
    if (slide.kind === 'teach') return;
    for (const block of slide.prompt) {
      if (block.kind === 'display') {
        expect(block.tex.trim(), `${_id}: bare single-letter display`).not.toMatch(/^[A-Za-z]$/);
        expect(block.tex.trim(), `${_id}: word-only display`).not.toMatch(/^\\text\{[^{}]*\}$/);
      }
    }
  });

  it('produces an answer its own checker accepts', () => {
    for (const { params, seed } of cases()) {
      const slide = (generator as Generator<unknown>).render(params);
      if (slide.kind !== 'expression') continue;

      const verdict = checkAnswer(slide.answer, slide.answer, {
        domain: slide.domain,
        mode: slide.mode,
        seed,
      });
      expect(verdict.status, `seed ${seed}: ${slide.answer}`).toBe('correct');
    }
  });

  it('rejects a perturbed answer', () => {
    for (const { params, seed } of cases()) {
      const slide = (generator as Generator<unknown>).render(params);
      if (slide.kind !== 'expression') continue;

      // An indefinite integral is only defined up to a constant, so adding 1 to
      // it is *supposed* to pass there and would prove nothing. Perturb by x
      // instead, which no valid antiderivative can absorb — and which still
      // fails a constant answer, since the expected side does not vary.
      const perturbed =
        slide.mode === 'upToConstant' ? `(${slide.answer}) + x` : `(${slide.answer}) + 1`;

      const verdict = checkAnswer(perturbed, slide.answer, {
        domain: slide.domain,
        mode: slide.mode,
        seed,
      });
      expect(verdict.status, `seed ${seed}: ${slide.answer}`).toBe('incorrect');
    }
  });

  it('leaves something to type after its prefill', () => {
    // A prefill is the question's half of the answer. If it graded as a
    // finished answer on its own, whatever the learner typed next would be
    // noise, and at worst the untouched box would already be right.
    for (const { params, seed } of cases()) {
      const slide = (generator as Generator<unknown>).render(params);
      if (slide.kind !== 'expression' || !slide.prefill) continue;
      const untouched = toAnswer(docFromKeys(slide.prefill).nodes);
      const verdict = checkAnswer(untouched, slide.answer, { domain: slide.domain, mode: slide.mode, seed });
      expect(verdict.status, `seed ${seed}: ${untouched}`).toBe('invalid');
    }
  });

  it('accepts every other writing it promises', () => {
    // A teach slide or solution step that says "either form is accepted" is a
    // promise about the checker, and the checker keeps it only through fields
    // like `domain` sitting elsewhere in the generator — `-a/(2*sqrt(x^3))`
    // agrees with `x^(-3/2)` for positive x and disagrees on the wider real
    // line, so a generator that changes `domain` without changing its prose
    // would silently break a promise nothing here used to check. `invalid` is
    // a failure too: a writing mathjs cannot parse is a promise nobody could
    // ever keep, whatever the domain.
    for (const { params, seed } of cases()) {
      const slide = (generator as Generator<unknown>).render(params);
      if (slide.kind !== 'expression' || !slide.alsoAccepts) continue;

      for (const writing of slide.alsoAccepts) {
        // The reducer's own argument order (session.ts:315): the learner's
        // text first, the expected answer second.
        const verdict = checkAnswer(writing, slide.answer, {
          domain: slide.domain,
          mode: slide.mode,
          seed,
        });
        expect(
          verdict.status,
          `seed ${seed}: promised writing ${writing} is not accepted against ${slide.answer} over ${slide.domain}`,
        ).toBe('correct');

        // Negative control on the same writing: the probe has to be live on
        // it, or a declaration that passes trivially (in the limit,
        // `alsoAccepts: [slide.answer]`) would sail through the check above.
        // Perturb it and require a rejection, exactly as "rejects a
        // perturbed answer" does for `answer` itself.
        const perturbed =
          slide.mode === 'upToConstant' ? `(${writing}) + x` : `(${writing}) + 1`;
        expect(
          checkAnswer(perturbed, slide.answer, {
            domain: slide.domain,
            mode: slide.mode,
            seed,
          }).status,
          `seed ${seed}: perturbed writing ${perturbed} was not rejected`,
        ).toBe('incorrect');
      }
    }
  });

  it("matches an independent symbolic derivative, where the generator declares its source", () => {
    // The other property tests only prove a generator agrees with itself: they
    // would happily pass a question whose stated answer is the wrong
    // derivative. This differentiates the source function with mathjs — an
    // oracle written by someone else — and checks the generator's answer
    // against it. A sign slip or a missed chain-rule factor fails here.
    for (const { params, seed } of cases()) {
      const slide = (generator as Generator<unknown>).render(params);
      if (slide.kind !== 'expression' || !slide.source) continue;

      const oracle = math.derivative(slide.source, 'x').toString();
      const verdict = checkAnswer(slide.answer, oracle, {
        domain: slide.domain,
        mode: slide.mode,
        seed,
      });
      expect(
        verdict.status,
        `seed ${seed}: d/dx(${slide.source}) is ${oracle}, generator claims ${slide.answer}`,
      ).toBe('correct');
    }
    // Symbolically differentiating every draw and then probing both sides at 24
    // points genuinely takes several seconds, which overruns vitest's 5s
    // default once the other files are competing for the CPU. The budget is
    // raised rather than the sample count cut: this is the only test that
    // checks the calculus is actually right, so coverage is the wrong thing to
    // trade away.
  }, 60_000);

  it('differentiates back to the integrand, where the generator declares one', () => {
    // The integration counterpart of the oracle above, and it has to run this
    // way round: mathjs differentiates our answer and the result must be the
    // integrand. Asking mathjs to integrate instead would be marking our
    // homework with the same kind of machinery that produced it — and its
    // symbolic integration is far weaker than its differentiation.
    //
    // Compared in `exact` mode deliberately, not the slide's own
    // `upToConstant`: a derivative has no arbitrary constant left in it, so the
    // looser comparison would let a genuinely wrong answer through whenever it
    // differed from the integrand by a constant.
    for (const { params, seed } of cases()) {
      const slide = (generator as Generator<unknown>).render(params);
      if (slide.kind !== 'expression' || !slide.integrand || slide.limits) continue;

      const oracle = math.derivative(slide.answer, 'x').toString();
      const verdict = checkAnswer(oracle, slide.integrand, {
        domain: slide.domain,
        mode: 'exact',
        seed,
      });
      expect(
        verdict.status,
        `seed ${seed}: d/dx(${slide.answer}) is ${oracle}, integrand is ${slide.integrand}`,
      ).toBe('correct');
    }
  }, 60_000);

  it('agrees with quadrature, where the generator declares limits', () => {
    // A definite integral answers with a number, so the oracle is numerical:
    // Simpson's rule over the stated interval, which knows nothing about how
    // the generator arrived at its value. On the polynomials these questions
    // use it is exact to well inside the tolerance.
    for (const { params, seed } of cases()) {
      const slide = (generator as Generator<unknown>).render(params);
      if (slide.kind !== 'expression' || !slide.integrand || !slide.limits) continue;

      const [lower, upper] = slide.limits;
      const parsed = parseExpression(slide.integrand);
      expect(parsed.ok, `unparseable integrand: ${slide.integrand}`).toBe(true);
      if (!parsed.ok) continue;

      const steps = 1000; // even, as Simpson's rule requires
      const h = (upper - lower) / steps;
      let total = 0;
      for (let i = 0; i <= steps; i += 1) {
        const weight = i === 0 || i === steps ? 1 : i % 2 === 1 ? 4 : 2;
        total += weight * (parsed.node.evaluate({ x: lower + i * h }) as number);
      }
      const quadrature = (total * h) / 3;
      const claimed = Number(slide.answer);

      expect(Number.isNaN(claimed), `non-numeric answer with limits: ${slide.answer}`).toBe(false);
      expect(
        Math.abs(quadrature - claimed),
        `seed ${seed}: quadrature gives ${quadrature}, generator claims ${claimed}`,
      ).toBeLessThan(1e-6 * Math.max(1, Math.abs(claimed)));
    }
  });

  // Six hundred draws per difficulty whatever SEEDS says, so it is left to the
  // full sweep: in the smoke run it was three fifths of the time and tests the
  // generator's pool, not the checker the smoke run is there for.
  it.skipIf(SEEDS < FULL_SEEDS)('can ask more distinct questions than a lesson has slides', () => {
    // The reducer re-draws a slide that duplicates one already in the deck, but
    // it can only do that while the generator has another question left to
    // give. A pool smaller than a lesson's appetite exhausts that budget and
    // the duplicate reaches the learner anyway — which is how five identical
    // questions once shipped in one lesson.
    for (const difficulty of DIFFICULTIES) {
      const seen = new Set<string>();
      for (let seed = 0; seed < 600; seed += 1) {
        const params = (generator as Generator<unknown>).sample(makeRng(seed), difficulty);
        seen.add(JSON.stringify((generator as Generator<unknown>).render(params)));
      }
      // A lesson asks one generator at most ten times, and a level check
      // twelve. Twenty-five leaves the re-draw room to work with.
      expect(seen.size, `difficulty ${difficulty} offers only ${seen.size} questions`)
        .toBeGreaterThanOrEqual(25);
    }
  });

  it('always offers a worked solution', () => {
    for (const { params } of cases()) {
      const steps = (generator as Generator<unknown>).solution(params);
      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) {
        expect(step.text ?? step.tex).toBeTruthy();
      }
    }
  });

  it('varies its worked solution with the question', () => {
    // The reason render and solution share parameters is so the steps describe
    // the learner's actual numbers. A solution that reads the same regardless
    // of the question would be a generic explanation, which is far less useful
    // when you have just got something wrong.
    const texts = new Set(
      cases().slice(0, 60).map(({ params }) =>
        (generator as Generator<unknown>)
          .solution(params)
          .map((step) => `${step.text ?? ''} ${step.tex ?? ''}`)
          .join(' '),
      ),
    );
    expect(texts.size).toBeGreaterThan(1);
  });
}
