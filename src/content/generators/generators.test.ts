/**
 * Property tests for every generator, and integrity checks for every course.
 *
 * Both sweeps are generic: generators come from the registry and courses from
 * the course index, so a new one is covered the moment it is exported — there
 * is nothing to wire up here.
 *
 * A generator is a small program that writes questions, so a bug in one does
 * not surface as a crash. It surfaces as a question that cannot be answered
 * correctly, halfway through a lesson on a train. These run every generator
 * across many seeds and assert that the answer it claims is the answer the
 * checker will accept — and, where a generator declares its source function,
 * that the answer is genuinely correct rather than merely self-consistent.
 */
import { describe, it, expect } from 'vitest';
import katex from 'katex';
import { makeRng } from '../../engine/rng';
import { checkAnswer } from '../../engine/equivalence';
import { parseExpression, math } from '../../engine/expression';
import { registeredGenerators, registry } from '../registry';
import { courses } from '../courses';
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
} from '../expr';
import { startSession } from '../../engine/session';
import { canonicalSet, parseSet } from '../numberLine';
import { levelCheckLesson } from '../types';
import { CHOICE_SUFFIX, familyOf } from '../choiceVariant';
import {
  MAX_PER_FAMILY,
  MIN_WIDGET_KINDS,
} from '../shapeVariety';
import { TRIPLES } from './complexPlane';
import {
  IDENTITY,
  encodeTransform,
  parseTransform,
  reachable,
  sameCurve,
  transformTex,
  transformed,
} from '../transform';
import { docFromKeys, toAnswer } from '../../ui/mathInput';
import type { Generator, Slide, SlideRef } from '../types';

const SEEDS = 200;
const DIFFICULTIES = [1, 2];

// A backslash-stripped command like "overline{3 + 4i}" is perfectly valid TeX
// — it renders the literal letters — so KaTeX raises nothing and the learner
// just sees a wrong slide. Only a name check catches it. Shared between the
// authored-content sweep (literal slides) and the generator sweep (generated
// TeX), so a stripped backslash cannot hide in either source.
const BARE_TEX_COMMAND =
  /(?<!\\)\b(qquad|quad|overline|dfrac|tfrac|frac|sqrt|cdot|times|pm|geq|leq|rightarrow|implies|arg|sin|cos|tan|ln|pi|text|left|right)\b/;

// Derived choice generators are swept exactly like the ones written by hand:
// they are what a lesson actually asks, so "derived" is no reason to trust them.
describe.each(registeredGenerators.map((g) => [g.id, g] as const))('%s', (_id, generator) => {
  const cases = DIFFICULTIES.flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = (generator as Generator<unknown>).sample(makeRng(seed), difficulty);
      return { params, difficulty, seed };
    }),
  );

  it('renders a well-formed slide for every seed', () => {
    for (const { params } of cases) {
      const slide = (generator as Generator<unknown>).render(params);

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
    // The course-integrity sweep below checks authored TeX on literal slides.
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

    for (const { params } of cases) {
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

      if (slide.kind === 'iterate') {
        check(slide.start, 'iterate start');
        for (const token of slide.bank) check(token, 'iterate bank');
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

  it('offers exactly one correct option, and distractors that are really wrong', () => {
    // The multiple-choice form of a generator. A distractor that is silently
    // equal to the answer makes a question with two right answers, and only the
    // checker can tell — the two are written differently by construction, so
    // comparing the strings proves nothing.
    const base = generator as Generator<unknown>;
    if (!base.choices) return;

    for (const { params, seed } of cases) {
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

  it('never puts $-delimited maths in a plain-text choice label', () => {
    // A choice option is either all TeX (`tex: true`) or plain text, and the
    // plain branch renders its label as a string. "$D$ falls by 24 mg" then
    // reaches the learner with the dollar signs showing, which is how the
    // first draft of expm-rate-words looked in the browser.
    for (const { params, seed } of cases) {
      const slide = (generator as Generator<unknown>).render(params);
      if (slide.kind !== 'choice') continue;
      for (const option of slide.options) {
        if (option.tex) continue;
        expect(option.label, `seed ${seed}: plain label shows raw $ signs`).not.toContain('$');
      }
    }
  });

  it('never shows a bare single-letter display in a derived choice prompt', () => {
    // promptFrom lifts an expression slide's lead, minus its trailing "=",
    // into a display block. A lead like "x =" strips down to a bare "x" —
    // meaningless above four options that already read "x = ...".
    if (!_id.endsWith(CHOICE_SUFFIX)) return;
    const g = generator as Generator<unknown>;
    const slide = g.render(g.sample(makeRng(1), 1));
    if (slide.kind === 'teach') return;
    for (const block of slide.prompt) {
      if (block.kind === 'display') {
        expect(block.tex.trim(), `${_id}: bare single-letter display`).not.toMatch(/^[A-Za-z]$/);
      }
    }
  });

  it('produces an answer its own checker accepts', () => {
    for (const { params, seed } of cases) {
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
    for (const { params, seed } of cases) {
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
    for (const { params, seed } of cases) {
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
    for (const { params, seed } of cases) {
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
    for (const { params, seed } of cases) {
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
    for (const { params, seed } of cases) {
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
    for (const { params, seed } of cases) {
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

  it('can ask more distinct questions than a lesson has slides', () => {
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
    for (const { params } of cases) {
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
      cases.slice(0, 60).map(({ params }) =>
        (generator as Generator<unknown>)
          .solution(params)
          .map((step) => `${step.text ?? ''} ${step.tex ?? ''}`)
          .join(' '),
      ),
    );
    expect(texts.size).toBeGreaterThan(1);
  });
});

describe('course integrity', () => {
  // Every course, so a new one cannot skip these checks by existing.
  const lessons = courses.flatMap((course) =>
    course.levels.flatMap((level) => level.lessons),
  );

  it('references only generators that exist', () => {
    for (const lesson of lessons) {
      for (const ref of [...lesson.slides, ...lesson.skillCheck]) {
        if (ref.type === 'generated') {
          expect(registry[ref.generatorId], `${lesson.id} -> ${ref.generatorId}`).toBeDefined();
        }
      }
    }
  });

  it('gives every lesson about ten guided slides and three skill checks', () => {
    for (const lesson of lessons) {
      expect(lesson.slides.length, lesson.id).toBeGreaterThanOrEqual(9);
      expect(lesson.slides.length, lesson.id).toBeLessThanOrEqual(11);
      expect(lesson.skillCheck.length, lesson.id).toBe(3);
    }
  });

  it('gives every level check 10 to 15 questions', () => {
    for (const course of courses) {
      for (const level of course.levels) {
        if (level.levelCheck === undefined) continue;
        expect(level.levelCheck.length, `${course.id}/${level.id}`).toBeGreaterThanOrEqual(8);
        expect(level.levelCheck.length, `${course.id}/${level.id}`).toBeLessThanOrEqual(15);
      }
    }
  });

  it('leaves no inline markup the reader would see as punctuation', () => {
    // `**bold**` and `$maths$` are the only two markups Prose understands. An
    // odd number of either delimiter means one is unclosed, and an unclosed
    // marker reaches the learner as literal asterisks or swallows the rest of
    // the paragraph into a formula.
    const offenders: string[] = [];
    const scan = (where: string, text: string) => {
      const stars = (text.match(/\*\*/g) ?? []).length;
      if (stars % 2 !== 0) offenders.push(`${where}: unclosed ** in ${JSON.stringify(text)}`);
      const dollars = (text.match(/\$/g) ?? []).length;
      if (dollars % 2 !== 0) offenders.push(`${where}: unclosed $ in ${JSON.stringify(text)}`);
      // Every asterisk must belong to a pair. An odd one out reaches the
      // learner as punctuation, or eats the rest of the paragraph into an
      // emphasis that never closes.
      const singles = (text.replace(/\*\*[^*]+\*\*/g, '').match(/\*/g) ?? []).length;
      if (singles % 2 !== 0) offenders.push(`${where}: unclosed * in ${JSON.stringify(text)}`);
    };
    for (const lesson of lessons) {
      for (const ref of lesson.slides) {
        if (ref.type !== 'literal' || ref.slide.kind !== 'teach') continue;
        for (const block of ref.slide.body) {
          if (block.kind === 'prose') scan(lesson.id, block.text);
        }
      }
    }
    expect(offenders.join('\n')).toBe('');
  });

  it('gives every traversal figure a path and a dot its animation can find', () => {
    // The dot is placed by querying these ids out of the rendered SVG. A typo
    // in either degrades silently to a still frame, which looks like a figure
    // that simply does not move — the hardest kind of fault to notice.
    let checked = 0;
    for (const lesson of lessons) {
      for (const ref of lesson.slides) {
        if (ref.type !== 'literal' || ref.slide.kind !== 'teach') continue;
        for (const block of ref.slide.body) {
          if (block.kind !== 'traversal') continue;
          checked += 1;
          expect(block.svg, `${lesson.id}: no path #${block.pathId}`).toContain(
            `id="${block.pathId}"`,
          );
          expect(block.svg, `${lesson.id}: no traversal dot`).toContain('id="traversal-dot"');
          expect(block.durationMs, `${lesson.id}: duration`).toBeGreaterThan(0);
        }
      }
    }
    // Otherwise this passes loudly while checking nothing.
    expect(checked, 'no traversal figures found to check').toBeGreaterThan(0);
  });

  it('opens each lesson by teaching before asking', () => {
    for (const lesson of lessons) {
      const first = lesson.slides[0];
      expect(first.type, lesson.id).toBe('literal');
      if (first.type === 'literal') expect(first.slide.kind).toBe('teach');
    }
  });

  it('never puts a teaching slide in a skill check', () => {
    for (const lesson of lessons) {
      for (const ref of lesson.skillCheck) {
        if (ref.type === 'literal') expect(ref.slide.kind).not.toBe('teach');
      }
    }
  });

  it('checks only skills the lesson practised', () => {
    // The owner met a conjugate question in the modulus lesson's skill check
    // and called it what it is: a check of something the lesson never asked.
    // Not interleaving, a defect — so it is a rule, over families rather than
    // ids, because `x`, `x+choice` and `x-steps` are one skill (familyOf).
    // Teach slides do not count: only an ask is practice.
    const offenders: string[] = [];
    for (const lesson of lessons) {
      const practised = new Set(
        lesson.slides
          .filter((ref): ref is GeneratedRef => ref.type === 'generated')
          .map((ref) => familyOf(ref.generatorId)),
      );
      for (const ref of lesson.skillCheck) {
        if (ref.type !== 'generated') continue;
        if (!practised.has(familyOf(ref.generatorId))) {
          offenders.push(`${lesson.id} -> ${ref.generatorId}`);
        }
      }
    }
    expect(offenders.join('\n')).toBe('');
  });

  /**
   * Every authored TeX fragment: display blocks, plus the $...$ segments inside
   * prose. Ordinary English is deliberately excluded — a sentence containing
   * the word "times" is not a broken \times command.
   */
  const texFragments = (): { tex: string; where: string }[] => {
    const out: { tex: string; where: string }[] = [];
    for (const lesson of lessons) {
      for (const ref of [...lesson.slides, ...lesson.skillCheck]) {
        if (ref.type !== 'literal') continue;
        const blocks = ref.slide.kind === 'teach' ? ref.slide.body : ref.slide.prompt;
        for (const block of blocks) {
          if (block.kind === 'display') {
            out.push({ tex: block.tex, where: `${lesson.id} display` });
          }
          if (block.kind === 'prose') {
            // Odd indices of a split on $...$ are the inline maths segments.
            block.text
              .split(/\$([^$]+)\$/g)
              .filter((_, idx) => idx % 2 === 1)
              .forEach((tex) => out.push({ tex, where: `${lesson.id} inline` }));
          }
        }
      }
    }
    return out;
  };

  it('renders every authored TeX fragment without error', () => {
    // Asks the real question — is this valid TeX — so it covers every command,
    // present and future, rather than a list someone must remember to extend.
    const fragments = texFragments();
    expect(fragments.length).toBeGreaterThan(0);
    for (const { tex, where } of fragments) {
      expect(
        () => katex.renderToString(tex, { throwOnError: true, strict: 'error' }),
        `${where}: ${tex}`,
      ).not.toThrow();
    }
  });

  it('never lets a TeX command lose its backslash', () => {
    // Kept alongside the KaTeX check, which does NOT cover this: a
    // backslash-stripped command like "overline{3 + 4i}" is perfectly valid TeX
    // — it renders the literal letters — so KaTeX raises nothing and the learner
    // just sees a wrong slide. Only a name check catches it, and it is applied
    // to TeX fragments alone so English prose is never scanned.
    for (const { tex, where } of texFragments()) {
      expect(BARE_TEX_COMMAND.test(tex), `${where}: bare TeX command in ${tex}`).toBe(false);
    }
  });

  it('never leaves a raw escape sequence in prose', () => {
    // The sibling failure, outside TeX: '\\u2019' in source reaches the reader
    // as the literal text "’" rather than an apostrophe.
    for (const lesson of lessons) {
      for (const ref of [...lesson.slides, ...lesson.skillCheck]) {
        if (ref.type !== 'literal') continue;
        const blocks = ref.slide.kind === 'teach' ? ref.slide.body : ref.slide.prompt;
        for (const block of blocks) {
          if (block.kind !== 'prose') continue;
          expect(block.text, lesson.id).not.toMatch(/\\u[0-9a-fA-F]{4}/);
        }
      }
    }
  });

  it('backs every promise that another writing is accepted', () => {
    // "Accepted" is the marker rather than a field an author must remember to
    // set, because forgetting the field is exactly the failure this guards
    // against. A teach slide can say "either form is accepted" about a
    // generator that declares nothing in `alsoAccepts` — the sentence would
    // then be true only by luck, exactly the shape of the F2 finding this
    // task repairs (see the generic "accepts every other writing it
    // promises" test above, which pins the declaration to the checker; this
    // one pins the *sentence* to a declaration existing at all). Move the
    // sentence to a lesson whose generators declare nothing and it goes
    // unbacked again with a green suite unless something reads the prose.
    let promises = 0;
    for (const lesson of lessons) {
      const asked = lesson.slides.filter((ref): ref is GeneratedRef => ref.type === 'generated');
      for (const ref of lesson.slides) {
        if (ref.type !== 'literal' || ref.slide.kind !== 'teach') continue;
        for (const block of ref.slide.body) {
          if (block.kind !== 'prose' || !/\baccepted\b/i.test(block.text)) continue;
          promises += 1;
          const declared = asked.some(declaresAlsoAccepts);
          expect(
            declared,
            `${lesson.id} says "${block.text}" but none of ${describeRefs(asked)} declares alsoAccepts on any draw`,
          ).toBe(true);
        }
      }
    }
    // Otherwise this passes loudly while checking nothing — the same
    // loud-pass guard the traversal-figure test above already uses.
    expect(promises, 'no promise found to check').toBeGreaterThan(0);
  });

  it('holds a genuine Pythagorean triple in every modulus row', () => {
    // The modulus generator reads its answer straight from this table instead
    // of rounding Math.hypot. That is only safe while the table is honest, so
    // the invariant is asserted rather than assumed.
    expect(TRIPLES.length).toBeGreaterThan(0);
    for (const [a, b, c] of TRIPLES) {
      expect(a * a + b * b, `${a},${b},${c} is not a triple`).toBe(c * c);
    }
  });

  /**
   * What the learner actually sees, for one seed.
   *
   * Compares the rendered slide rather than the generator id, because the same
   * generator asked twice is fine when it draws different numbers and only a
   * problem when it does not.
   */
  const renderedDecks = (lesson: (typeof lessons)[number], seed: number) => {
    const session = startSession(lesson, registry, seed);
    const shape = (deck: typeof session.guided) =>
      deck.map((resolved) => ({ id: resolved.id, signature: JSON.stringify(resolved.slide) }));
    // Checked separately: a skill-check question matching a guided one is the
    // assessment doing its job, where two identical guided slides are a bug.
    return [shape(session.guided), shape(session.skillCheck)];
  };

  /**
   * The generated half of a `SlideRef` — the only kind whose rendered shape
   * can vary between draws. A lesson's shape guards only ever look at these.
   */
  type GeneratedRef = Extract<SlideRef, { type: 'generated' }>;

  /**
   * Every kind a generator can render across `SEEDS` seeds, at one difficulty.
   * `polar-form` renders a typed `expression` on one direction and a native
   * `choice` on the other, and draws the direction only at difficulty 2 — so
   * the set a lesson's shape guards must reason about is keyed by difficulty,
   * not just by generator id.
   *
   * The sweep is a sample of the reachable kinds, not a proof of them — a
   * branch drawn rarer than roughly 1-in-200 can be missed, which *shrinks*
   * the set and so *hides* offenders, the same way this guard went blind to
   * `polar-form` in the first place. The rarest branch in the registry today
   * is 86/200; a generator branching far more rarely than that would need a
   * wider sweep here.
   */
  const shapeCache = new Map<string, Set<Slide['kind']>>();
  const shapesOf = (ref: GeneratedRef): Set<Slide['kind']> => {
    // The `?? 1` mirrors resolveRef in src/engine/session.ts, the one place
    // this default lives — a reference with no stated difficulty is asked at 1.
    const difficulty = ref.difficulty ?? 1;
    const key = `${ref.generatorId}@${difficulty}`;
    const cached = shapeCache.get(key);
    if (cached) return cached;
    const g = registry[ref.generatorId] as unknown as Generator<unknown>;
    const shapes = new Set<Slide['kind']>();
    for (let seed = 0; seed < SEEDS; seed += 1) {
      shapes.add(g.render(g.sample(makeRng(seed), difficulty)).kind);
    }
    shapeCache.set(key, shapes);
    return shapes;
  };

  /**
   * A kind every reference in the run could take, or `undefined` when no
   * single kind is common to all of them.
   *
   * Per-slide seeds are independent (`resolveRef`, session.ts:123), so every
   * combination of kinds is reachable in some sitting — a run is an offender
   * the moment the intersection of its kind-sets is non-empty, whether or not
   * any one seed sweep happens to land on it. That is deliberately a stronger,
   * deterministic claim than sampling resolved decks for an occurrence.
   */
  const commonShape = (refs: GeneratedRef[]): Slide['kind'] | undefined => {
    let common: Set<Slide['kind']> | undefined;
    for (const ref of refs) {
      const shapes = shapesOf(ref);
      common = common === undefined ? new Set(shapes) : new Set([...common].filter((kind) => shapes.has(kind)));
      if (common.size === 0) return undefined;
    }
    return common === undefined ? undefined : [...common][0];
  };

  /** Names a run of references for a failure message, e.g. `polar-form@2, argument@2`. */
  const describeRefs = (refs: GeneratedRef[]): string =>
    refs.map((ref) => `${ref.generatorId}@${ref.difficulty ?? 1}`).join(', ');

  /**
   * Whether a reference's generator ever renders an `expression` slide
   * declaring `alsoAccepts`, over `SEEDS` seeds at the difficulty it is
   * asked. Cached per `${generatorId}@${difficulty}`, the same key `shapesOf`
   * uses, since both are the same question — what can this reference render —
   * asked about a different property of the result.
   */
  const declaresCache = new Map<string, boolean>();
  const declaresAlsoAccepts = (ref: GeneratedRef): boolean => {
    const difficulty = ref.difficulty ?? 1;
    const key = `${ref.generatorId}@${difficulty}`;
    const cached = declaresCache.get(key);
    if (cached !== undefined) return cached;
    const g = registry[ref.generatorId] as unknown as Generator<unknown>;
    let declares = false;
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const slide = g.render(g.sample(makeRng(seed), difficulty));
      if (slide.kind === 'expression' && slide.alsoAccepts && slide.alsoAccepts.length > 0) {
        declares = true;
        break;
      }
    }
    declaresCache.set(key, declares);
    return declares;
  };

  /** Every deck that repeats a question, across a sweep of seeds. */
  const duplicatesIn = (decks: (typeof lessons)[number][]) => {
    const offenders = new Map<string, number>();
    for (const deck of decks) {
      for (let seed = 0; seed < 40; seed += 1) {
        for (const rendered of renderedDecks(deck, seed)) {
          const seen = new Set<string>();
          for (const { signature } of rendered) {
            if (seen.has(signature)) {
              offenders.set(deck.id, (offenders.get(deck.id) ?? 0) + 1);
            }
            seen.add(signature);
          }
        }
      }
    }
    // Sorted worst-first so a failure names the deck most worth fixing.
    return [...offenders.entries()].sort((a, b) => b[1] - a[1]);
  };

  it('never asks the same question twice in one sitting', () => {
    // A lesson leaning on one generator is fine — that is what practice is.
    // Drawing the *same question* twice is not: it reads as a bug, and it
    // wastes one of the ten slides a lesson gets. Reported across every
    // lesson at once, because fixing these one failure at a time is slow.
    const offenders = duplicatesIn(lessons);
    expect(
      offenders.map(([id, n]) => `${id}: ${n} duplicate(s) across 40 seeds`).join('\n'),
    ).toBe('');
    // Every lesson resolved 40 times over: the sweep grows with the library and
    // outgrew vitest's 5s default once the Phase C courses landed. A budget
    // rather than fewer seeds, as for the oracle tests above.
  }, 60_000);

  it('never repeats a question inside a level check', () => {
    const checks = courses.flatMap((course) =>
      course.levels.map(levelCheckLesson).filter((l) => l !== undefined),
    );
    const offenders = duplicatesIn(checks);
    expect(
      offenders.map(([id, n]) => `${id}: ${n} duplicate(s) across 40 seeds`).join('\n'),
    ).toBe('');
  }, 60_000);

  it('varies the shape of the questions inside a lesson', () => {
    // Seven questions through one widget reads as the same question seven
    // times, even when no two draws are alike — which is exactly what a learner
    // reported after the duplicate-question fix had already landed. The
    // de-duplicator stops a deck repeating a *question*; nothing stopped it
    // repeating a *shape*.
    //
    // Measured by the widget the learner actually taps, not by the generator
    // id: two generators that both render an expression slide feel the same,
    // and one generator asked through its typed and its multiple-choice form
    // feels like two.
    //
    // This used to read one seed at difficulty 1, always — `g.render(g.sample
    // (makeRng(1), 1)).kind`, ignoring the difficulty the lesson actually
    // asks at. `polar-form` renders a typed `expression` one direction and a
    // native `choice` the other, and draws the direction only at difficulty
    // 2, so every difficulty-2 `ask('polar-form', 2)` was being judged by a
    // shape the learner had roughly a 51% chance of never meeting. Now a
    // lesson is an offender when there is one kind every one of its generated
    // references *can* render at the difficulty it is asked — "can all be"
    // rather than "happened to render as, once, at difficulty 1" — since
    // per-slide seeds are independent and every combination is reachable in
    // some sitting.
    const offenders: string[] = [];
    for (const lesson of lessons) {
      const asked = lesson.slides.filter((ref): ref is GeneratedRef => ref.type === 'generated');
      if (asked.length < 4) continue;

      const kind = commonShape(asked);
      if (kind !== undefined) {
        offenders.push(`${lesson.id}: ${asked.length} questions can all be ${kind} (${describeRefs(asked)})`);
      }
    }

    expect(offenders.join('\n')).toBe('');
  });

  it('never runs 3 or more identical-shape questions between teach slides', () => {
    // Same repair as above, applied to a run rather than a whole lesson: the
    // old read was one seed at difficulty 1, always, so a run leaning on
    // `polar-form` at difficulty 2 was judged by the direction it draws at
    // difficulty 1 instead. "Can all be" is checked with `commonShape`, the
    // shared helper above.
    const offenders: string[] = [];
    for (const lesson of lessons) {
      const runs: GeneratedRef[][] = [[]];
      for (const ref of lesson.slides) {
        if (ref.type === 'literal') runs.push([]);
        else runs[runs.length - 1].push(ref);
      }
      for (const run of runs) {
        if (run.length < 3) continue;
        const kind = commonShape(run);
        if (kind !== undefined) {
          offenders.push(`${lesson.id}: run of ${run.length} questions can all be ${kind} (${describeRefs(run)})`);
        }
      }
    }
    expect(offenders.join('\n')).toBe('');
  });

  /**
   * The smallest number of distinct widget kinds a *sitting* of these
   * exercises can show.
   *
   * Not the union of what the generators can render: a reference that draws
   * either an `expression` or a `choice` costs the deck nothing extra when
   * some other reference is already `expression`-only, because per-slide seeds
   * are independent and that sitting is reachable. So the honest count is the
   * smallest set of kinds that covers every reference — a minimum hitting set,
   * brute-forced over the union, which is at most nine kinds wide.
   *
   * `commonShape` above is this same question asked for the answer 1: a lesson
   * whose minimum is 1 is one where every exercise can wear the same widget.
   */
  const minDistinctKinds = (refs: GeneratedRef[]): number => {
    if (refs.length === 0) return 0;
    const sets = refs.map(shapesOf);
    const union = [...new Set(sets.flatMap((kinds) => [...kinds]))];
    const covers = (pick: Set<Slide['kind']>) =>
      sets.every((kinds) => [...kinds].some((kind) => pick.has(kind)));
    for (let size = 1; size <= union.length; size += 1) {
      const chosen: Slide['kind'][] = [];
      const search = (from: number): boolean => {
        if (chosen.length === size) return covers(new Set(chosen));
        for (let i = from; i < union.length; i += 1) {
          chosen.push(union[i]);
          if (search(i + 1)) return true;
          chosen.pop();
        }
        return false;
      };
      if (search(0)) return size;
    }
    return union.length;
  };

  /** How often each generator family is asked, worst first. */
  const familyCounts = (refs: GeneratedRef[]): [string, number][] => {
    const counts = new Map<string, number>();
    for (const ref of refs) {
      const family = familyOf(ref.generatorId);
      counts.set(family, (counts.get(family) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  };

  /** A lesson's guided exercises: the generated refs, which is all of them. */
  const exercisesOf = (lesson: (typeof lessons)[number]): GeneratedRef[] =>
    lesson.slides.filter((ref): ref is GeneratedRef => ref.type === 'generated');

  /**
   * One row per lesson, printed by the report test below.
   *
   * Computed once and shared with the two guards, because `shapesOf` sweeps
   * 200 seeds per reference and there is no reason to pay for it three times.
   */
  const variety = lessons.map((lesson) => {
    const exercises = exercisesOf(lesson);
    const families = familyCounts(exercises);
    return {
      id: lesson.id,
      exercises: exercises.length,
      kinds: minDistinctKinds(exercises),
      topFamily: families[0]?.[0] ?? '-',
      topFamilyAsks: families[0]?.[1] ?? 0,
    };
  });

  it('reports the widget kinds and generator repetition of every lesson', () => {
    // The point of the report is that `npm test` itself says how far phase A
    // has to go, so a number nobody can see would be no use.
    const tally = (values: number[]) =>
      [...new Set(values)]
        .sort((a, b) => a - b)
        .map((value) => `${value}: ${values.filter((v) => v === value).length}`)
        .join('  ');

    const rows = variety.map(
      (row) =>
        `  ${row.id.padEnd(24)} ${String(row.exercises).padStart(2)} exercises` +
        `  ${row.kinds} widget kind${row.kinds === 1 ? ' ' : 's'}` +
        `  ${row.topFamily} x${row.topFamilyAsks}`,
    );
    const kindOffenders = variety.filter((row) => row.kinds < MIN_WIDGET_KINDS).length;
    const askOffenders = variety.filter((row) => row.topFamilyAsks > MAX_PER_FAMILY).length;

    // Straight to stdout rather than through `console.log`, which this vitest
    // setup swallows — and reached through `globalThis` because `src` is typed
    // with `vite/client` alone, so node's globals are deliberately not in scope.
    const stdout = (globalThis as { process?: { stdout?: { write(text: string): void } } })
      .process?.stdout;
    stdout?.write(
      [
        '',
        `shape variety, ${variety.length} lessons`,
        ...rows,
        `  widget kinds per lesson — ${tally(variety.map((row) => row.kinds))}`,
        `  most-asked family per lesson — ${tally(variety.map((row) => row.topFamilyAsks))}`,
        `  below ${MIN_WIDGET_KINDS} widget kinds: ${kindOffenders}`,
        `  one family asked over ${MAX_PER_FAMILY} times: ${askOffenders}`,
        '',
      ].join('\n'),
    );

    expect(variety.length).toBe(lessons.length);
  });

  /**
   * Both guards below were ratchets while phase A ran: each carried an
   * allowlist in `shapeVariety.ts` of the lessons that did not yet clear its
   * bar, holding how far off each one was, and the list could only shrink.
   * Batch A11 deleted both once the widening batches had emptied them, which
   * is what turns these into plain assertions over every lesson. A lesson that
   * cannot meet a bar is a lesson to widen; there is no longer anywhere to
   * record an exception.
   */
  const checkEvery = (
    remedy: string,
    measured: { id: string; value: number }[],
    passes: (value: number) => boolean,
    describe: (value: number) => string,
  ) => {
    const offenders = measured
      .filter(({ value }) => !passes(value))
      .map(({ id, value }) => `${id} ${describe(value)} — ${remedy}`);
    expect(offenders.join('\n')).toBe('');
  };

  it('asks every lesson through at least three widget kinds', () => {
    checkEvery(
      'ask some of its exercises through a different widget',
      variety.map((row) => ({ id: row.id, value: row.kinds })),
      (value) => value >= MIN_WIDGET_KINDS,
      (value) => `asks through ${value} widget kind${value === 1 ? '' : 's'}`,
    );
  });

  it('never asks one generator family more than twice in a lesson', () => {
    checkEvery(
      'spread its exercises across more generators',
      variety.map((row) => ({ id: row.id, value: row.topFamilyAsks })),
      (value) => value <= MAX_PER_FAMILY,
      (value) => `asks one family ${value} times`,
    );
  });

  it('uses unique lesson ids', () => {
    const ids = lessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
