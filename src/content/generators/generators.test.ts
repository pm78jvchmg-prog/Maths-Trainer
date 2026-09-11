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
import { valueOf, type Expr } from '../expr';
import { startSession } from '../../engine/session';
import { levelCheckLesson } from '../types';
import { CHOICE_SUFFIX } from '../choiceVariant';
import { TRIPLES } from './complexPlane';
import type { Generator } from '../types';

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
          } else {
            walk(node.arg, `${path}.a`);
          }
        };
        walk(slide.expr, 'r');

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
        expect(level.levelCheck.length, `${course.id}/${level.id}`).toBeGreaterThanOrEqual(10);
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
  });

  it('never repeats a question inside a level check', () => {
    const checks = courses.flatMap((course) =>
      course.levels.map(levelCheckLesson).filter((l) => l !== undefined),
    );
    const offenders = duplicatesIn(checks);
    expect(
      offenders.map(([id, n]) => `${id}: ${n} duplicate(s) across 40 seeds`).join('\n'),
    ).toBe('');
  });

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
    const shapeOf = (id: string) => {
      const g = registry[id] as unknown as Generator<unknown>;
      return g.render(g.sample(makeRng(1), 1)).kind;
    };

    const offenders: string[] = [];
    for (const lesson of lessons) {
      const asked = lesson.slides
        .filter((ref) => ref.type === 'generated')
        .map((ref) => (ref.type === 'generated' ? ref.generatorId : ''));
      if (asked.length < 4) continue;

      const shapes = new Set(asked.map(shapeOf));
      if (shapes.size < 2) {
        offenders.push(`${lesson.id}: ${asked.length} questions, all ${[...shapes][0]}`);
      }
    }

    expect(offenders.join('\n')).toBe('');
  });

  it('never runs 3 or more identical-shape questions between teach slides', () => {
    const shapeOf = (id: string) => {
      const g = registry[id] as unknown as Generator<unknown>;
      return g.render(g.sample(makeRng(1), 1)).kind;
    };
    const offenders: string[] = [];
    for (const lesson of lessons) {
      const runs: string[][] = [[]];
      for (const ref of lesson.slides) {
        if (ref.type === 'literal') runs.push([]);
        else runs[runs.length - 1].push(ref.generatorId);
      }
      for (const run of runs) {
        if (run.length < 3) continue;
        const shapes = new Set(run.map(shapeOf));
        if (shapes.size < 2) {
          offenders.push(`${lesson.id}: run of ${run.length} questions, all ${[...shapes][0]}`);
        }
      }
    }
    expect(offenders.join('\n')).toBe('');
  });

  it('uses unique lesson ids', () => {
    const ids = lessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
