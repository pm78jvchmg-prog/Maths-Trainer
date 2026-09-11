/**
 * The multiple-choice form of a generator.
 *
 * A lesson that asks one generator seven times asks seven questions through one
 * widget, and that reads as the same question over and over even when no two
 * draws are alike. The fix is not a second generator per lesson — that is the
 * same content written twice, and it falls out of step. It is a second *shape*
 * derived from the generator already there.
 *
 * So a generator may declare `choices(params)`, and this wraps it into a
 * derived generator under the id `<id>+choice`. The derived generator shares
 * the original's sampling, its prompt, and its worked solution: only the answer
 * mechanism changes, from typing or placing to picking. The learner meets the
 * same question twice in a lesson from two directions, which is what the
 * reference app does and what this file exists to make cheap.
 */
import type { Block, ChoiceOption, Generator, Slide } from './types';

/** Where the derived id comes from, so the suffix is written down once. */
export const CHOICE_SUFFIX = '+choice';

export function choiceId(generatorId: string): string {
  return `${generatorId}${CHOICE_SUFFIX}`;
}

/**
 * A stable rotation drawn from the options themselves.
 *
 * Not from the rng: a shuffle seeded per draw would make one question render
 * two ways, and the deck de-duplicator compares rendered slides, so the same
 * question could then appear twice in one lesson with the options moved around.
 * Hashing the labels keeps the answer off the first row without that cost.
 */
/** The options, turned so the answer is not always in the same place. */
function rotate(options: ChoiceOption[]): ChoiceOption[] {
  const turn = rotation(options);
  return [...options.slice(turn), ...options.slice(0, turn)];
}

function rotation(options: ChoiceOption[]): number {
  let hash = 0;
  for (const option of options) {
    for (let i = 0; i < option.tex.length; i += 1) {
      hash = (hash * 31 + option.tex.charCodeAt(i)) | 0;
    }
  }
  return Math.abs(hash) % options.length;
}

/**
 * The question a choice slide asks, taken from the original slide.
 *
 * An expression slide carries its question partly in `lead` — "\int 6x^2 dx ="
 * sits beside the input rather than in the prompt — so the lead has to be
 * lifted into the prompt or the derived question loses its subject. The
 * trailing "=" is dropped: it reads as an instruction to type when there is an
 * input to type into, and as a dangling symbol when there is not.
 */
function promptFrom(slide: Slide): Block[] {
  if (slide.kind === 'teach') return slide.body;
  if (slide.kind !== 'expression' || !slide.lead) return slide.prompt;
  const lead = slide.lead.replace(/\s*=\s*$/, '').trim();
  // A lead of just "x =" strips down to a bare letter, which displays above
  // four options that already read "x = ...": a display block with nothing
  // in it. quad-symmetry is the only generator this affects today.
  if (/^[A-Za-z]$/.test(lead)) return slide.prompt;
  return [...slide.prompt, { kind: 'display', tex: lead }];
}

/**
 * Derive the multiple-choice generator, or undefined when there is nothing to
 * derive from. Callers treat undefined as "this generator has one shape".
 */
export function choiceVariant<P>(generator: Generator<P>): Generator<P> | undefined {
  const { choices } = generator;
  if (!choices) return undefined;

  return {
    id: choiceId(generator.id),
    sample: (rng, difficulty) => generator.sample(rng, difficulty),
    render: (params): Slide => {
      const options = choices.call(generator, params);
      const base = generator.render(params);

      /**
       * A reduction's pick-one form is an `evaluate` slide, not a list of
       * options under a question: what is being asked is what goes in the
       * blank at the end of the line, and a slot in the equation says that
       * where four rows underneath would read as a quiz about it.
       */
      if (base.kind === 'reduce') {
        return {
          kind: 'evaluate',
          prompt: [{ kind: 'prose', text: 'Evaluate the expression.' }],
          expr: base.expr,
          options: rotate(options).map((option) => option.tex),
        };
      }

      const ordered = rotate(options);
      const correct = ordered.findIndex((option) => option.correct);

      return {
        kind: 'choice',
        prompt: promptFrom(generator.render(params)),
        // Indexed rather than labelled, because an option's text is the thing
        // being chosen between and would make a poor stable identifier.
        options: ordered.map((option, idx) => ({
          id: `opt${idx}`,
          label: option.tex,
          tex: true,
        })),
        correctId: `opt${correct}`,
      };
    },
    solution: (params) => generator.solution(params),
  };
}

/**
 * Build a generator's options: the right answer, then the standard slips.
 *
 * Distractors are computed from the question's own numbers, so two of them
 * collide for particular draws — `a + b` equals `a * b` when both are 2, and
 * the slide would then offer the same label twice, or worse offer the correct
 * answer twice under two ids. Colliding distractors are dropped rather than
 * adjusted, because a question with three options is fine and a question with
 * two right answers is not.
 *
 * Give a distractor an `answer` wherever it is an expression: a test then
 * proves it really is wrong, which comparing the displayed strings cannot do —
 * they differ by construction whether or not the values match.
 */
export function options(
  correct: Omit<ChoiceOption, 'correct'>,
  ...distractors: Omit<ChoiceOption, 'correct'>[]
): ChoiceOption[] {
  const seen = new Set([correct.tex]);
  const out: ChoiceOption[] = [{ ...correct, correct: true }];
  for (const distractor of distractors) {
    if (seen.has(distractor.tex)) continue;
    seen.add(distractor.tex);
    out.push(distractor);
  }
  return out;
}

/** Every derived choice generator for a list of generators, in the same order. */
export function choiceVariants(generators: Generator<unknown>[]): Generator<unknown>[] {
  return generators
    .map((generator) => choiceVariant(generator))
    .filter((generator): generator is Generator<unknown> => generator !== undefined);
}
