/**
 * The lesson runtime, as a pure reducer.
 *
 * Two rules from the brief are enforced here rather than in the UI, so that no
 * component can accidentally break them:
 *
 * 1. A wrong answer never discloses the answer. `submit` can only ever produce
 *    `incorrect`; reaching `revealed` requires an explicit `reveal` action.
 * 2. The skill check is sealed. `back` is refused outside the guided phase, and
 *    the phase transition is one-way, so there is no route to the worked
 *    examples once the assessment starts.
 *
 * A third rule falls out of the design: slides are resolved once, when the
 * session starts. `tryAgain` therefore re-presents the identical question
 * rather than drawing fresh parameters.
 */
import { makeRng, hashSeed } from './rng';
import { checkAnswer } from './equivalence';
import { isSolved, valueOf, type Move } from '../content/expr';
import type {
  Lesson,
  Slide,
  SolutionStep,
  GeneratorRegistry,
  SlideRef,
} from '../content/types';

export type Phase = 'guided' | 'skillCheck' | 'summary';

/** A point on the complex plane, as tapped on a plot slide. */
export interface PlotAnswer {
  re: number;
  im: number;
}

/**
 * An answer: an option id, a typed expression, one token per blank, or a
 * plotted point.
 *
 * The plot variant is a real member of the union rather than a "re,im" string,
 * so grading is a field comparison and nothing has to parse a convention back
 * out of text.
 */
export type Answer = string | string[] | PlotAnswer;

/** Narrows an answer to a plotted point. */
export function isPlotAnswer(answer: Answer): answer is PlotAnswer {
  return typeof answer === 'object' && !Array.isArray(answer);
}

export interface ResolvedSlide {
  id: string;
  slide: Slide;
  /** Lazily produces the worked solution, closed over the generated parameters. */
  solution: () => SolutionStep[];
}

export interface SlideState {
  attempts: number;
  /** The learner asked to see the answer on this slide. */
  revealed: boolean;
  solved: boolean;
  /** Correct on the first attempt, without revealing. Drives the score. */
  firstTry: boolean;
}

export type Feedback =
  | { kind: 'idle' }
  | { kind: 'correct' }
  | { kind: 'incorrect' }
  | { kind: 'revealed'; steps: SolutionStep[] }
  /** Unreadable input, reported separately so it does not count as a wrong answer. */
  | { kind: 'invalid'; message: string };

export interface Session {
  lessonId: string;
  seed: number;
  /**
   * One attempt per question, no worked solutions, scored as a percentage.
   *
   * Enforced here rather than in the feedback bar for the same reason as the
   * other two rules: a level check that could be retried by routing around a
   * component would not be an assessment.
   */
  assessment: boolean;
  phase: Phase;
  index: number;
  guided: ResolvedSlide[];
  skillCheck: ResolvedSlide[];
  states: Record<string, SlideState>;
  feedback: Feedback;
}

export type Action =
  | { type: 'submit'; answer: Answer }
  /** The learner changed their answer, which clears a wrong verdict. */
  | { type: 'edit' }
  | { type: 'tryAgain' }
  | { type: 'reveal' }
  | { type: 'continue' }
  | { type: 'back' };

const NO_SOLUTION: SolutionStep[] = [];

function resolveRef(
  ref: SlideRef,
  id: string,
  seed: number,
  registry: GeneratorRegistry,
  salt: number,
): ResolvedSlide {
  if (ref.type === 'literal') {
    const steps = ref.solution ?? NO_SOLUTION;
    return { id, slide: ref.slide, solution: () => steps };
  }

  const generator = registry[ref.generatorId];
  if (!generator) throw new Error(`Unknown generator: ${ref.generatorId}`);

  // Seeded per slide, so the same session seed always rebuilds the same lesson.
  // The salt is bumped only to escape a duplicate draw, and is part of the key
  // so the escape is itself deterministic.
  const rng = makeRng(hashSeed(`${seed}:${id}:${salt}`));
  const params = generator.sample(rng, ref.difficulty ?? 1) as never;
  const slide = generator.render(params);

  return {
    id,
    // A lead-in is prepended to the prompt rather than given a slide of its
    // own, which is what fuses the teaching with the question it sets up. Teach
    // slides have no prompt to prepend to, and a generator never produces one,
    // so the guard is for the type rather than for a real case.
    slide:
      ref.leadIn && ref.leadIn.length > 0 && slide.kind !== 'teach'
        ? { ...slide, prompt: [...ref.leadIn, ...slide.prompt] }
        : slide,
    solution: () => generator.solution(params),
  };
}

/**
 * How many times to re-draw a slide that duplicates one already in the deck.
 *
 * A generator draws from a finite pool, and a lesson may ask it eight or ten
 * times, so the birthday problem makes a repeat likely long before the pool is
 * exhausted — at ten draws from forty variants a collision is near-certain.
 * Widening every pool enough to make luck sufficient is not achievable for
 * questions like "what is i squared"; re-drawing on collision is, and it also
 * covers generators nobody has written yet.
 */
const REDRAW_LIMIT = 24;

/**
 * Resolves a deck, re-drawing any generated slide that comes out identical to
 * one already in it.
 *
 * Gives up after `REDRAW_LIMIT` attempts rather than looping: a generator with
 * fewer distinct questions than the lesson asks for cannot satisfy this, and
 * repeating one is better than hanging. The property tests hold the pools wide
 * enough that the limit is not reached in practice.
 */
function resolveDeck(
  refs: SlideRef[],
  lessonId: string,
  tag: string,
  seed: number,
  registry: GeneratorRegistry,
): ResolvedSlide[] {
  const out: ResolvedSlide[] = [];
  const seen = new Set<string>();

  refs.forEach((ref, idx) => {
    // The id is the key for per-slide state, so it never changes with the salt.
    const id = `${lessonId}:${tag}${idx}`;
    let resolved = resolveRef(ref, id, seed, registry, 0);

    if (ref.type === 'generated') {
      for (let salt = 1; salt <= REDRAW_LIMIT; salt += 1) {
        if (!seen.has(JSON.stringify(resolved.slide))) break;
        resolved = resolveRef(ref, id, seed, registry, salt);
      }
    }

    seen.add(JSON.stringify(resolved.slide));
    out.push(resolved);
  });

  return out;
}

export function startSession(
  lesson: Lesson,
  registry: GeneratorRegistry,
  seed: number = Date.now(),
): Session {
  // Guided and skill check are deduplicated separately: a skill-check question
  // matching one from the lesson is the assessment doing its job, where two
  // identical guided slides are just a wasted slide.
  const guided = resolveDeck(lesson.slides, lesson.id, 'g', seed, registry);
  const skillCheck = resolveDeck(lesson.skillCheck, lesson.id, 's', seed, registry);

  const states: Record<string, SlideState> = {};
  for (const resolved of [...guided, ...skillCheck]) {
    states[resolved.id] = { attempts: 0, revealed: false, solved: false, firstTry: false };
  }

  return {
    lessonId: lesson.id,
    seed,
    assessment: lesson.assessment === true,
    // A level check has no guided slides at all, and starting it in the guided
    // phase would strand it on an empty deck. Entering sealed straight away is
    // also the honest signal: there is nothing here to review.
    phase: guided.length > 0 ? 'guided' : 'skillCheck',
    index: 0,
    guided,
    skillCheck,
    states,
    feedback: { kind: 'idle' },
  };
}

/** The slides for the current phase. Empty once the lesson is finished. */
export function currentDeck(session: Session): ResolvedSlide[] {
  if (session.phase === 'guided') return session.guided;
  if (session.phase === 'skillCheck') return session.skillCheck;
  return [];
}

export function currentSlide(session: Session): ResolvedSlide | undefined {
  return currentDeck(session)[session.index];
}

/** Guided slides may be revisited; the skill check may not. */
export function canGoBack(session: Session): boolean {
  return session.phase === 'guided' && session.index > 0;
}

/** Whether the reveal affordance should be offered right now. */
export function canReveal(session: Session): boolean {
  // An assessment never shows working, so there is nothing to reveal.
  return !session.assessment && session.feedback.kind === 'incorrect';
}

/**
 * Whether the learner may still change their answer to this question.
 *
 * False throughout an assessment, where a submitted answer is final. The
 * widgets read this rather than deciding for themselves, so "one attempt"
 * cannot be undone by a component that forgets.
 */
export function canRetry(session: Session): boolean {
  return !session.assessment;
}

/**
 * Score as a percentage, which is how an assessment reports.
 *
 * Rounded to a whole number; an empty assessment scores zero rather than
 * dividing by nothing.
 */
export function scorePercent(session: Session): number {
  const { correct, total } = skillCheckScore(session);
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

/** Correct-first-time count for the skill check. */
export function skillCheckScore(session: Session): { correct: number; total: number } {
  const total = session.skillCheck.length;
  const correct = session.skillCheck.filter((s) => session.states[s.id]?.firstTry).length;
  return { correct, total };
}

/**
 * Exact, ordered comparison of one chosen token per position.
 *
 * Shared by the slide kinds whose answer is a sequence of picks from a bank.
 * A short answer is wrong rather than incomplete: the widget refuses to submit
 * until every position is filled, so a gap reaching here is not a valid answer.
 */
/**
 * One reduction, as the widget stores it: `<node path>=<value>`.
 *
 * A single string because `Answer` already carries `string[]`, so recording
 * both halves of a move this way needs no new shape in the session — and the
 * value and the ordering are then graded together rather than separately.
 */
function parseMove(token: string): Move | undefined {
  const at = token.lastIndexOf('=');
  if (at < 1) return undefined;
  const value = Number(token.slice(at + 1));
  if (!Number.isFinite(value)) return undefined;
  return { path: token.slice(0, at), value };
}

function gradeSequence(answer: Answer, expected: string[]): Feedback {
  if (!Array.isArray(answer)) return { kind: 'incorrect' };
  if (answer.length !== expected.length) return { kind: 'incorrect' };
  if (answer.some((token) => token === '')) return { kind: 'incorrect' };
  return answer.every((token, idx) => token === expected[idx])
    ? { kind: 'correct' }
    : { kind: 'incorrect' };
}

function grade(slide: Slide, answer: Answer, seed: number): Feedback {
  switch (slide.kind) {
    case 'teach':
      return { kind: 'correct' };

    case 'choice':
      return answer === slide.correctId ? { kind: 'correct' } : { kind: 'incorrect' };

    case 'expression': {
      if (typeof answer !== 'string') return { kind: 'incorrect' };
      const verdict = checkAnswer(answer, slide.answer, {
        domain: slide.domain,
        mode: slide.mode,
        seed,
      });
      // Both unreadable and unverifiable input are surfaced as `invalid`: in
      // each case we cannot say the learner was wrong, only that we could not
      // grade what they entered.
      if (verdict.status === 'invalid' || verdict.status === 'indeterminate') {
        return { kind: 'invalid', message: verdict.message };
      }
      return verdict.status === 'correct' ? { kind: 'correct' } : { kind: 'incorrect' };
    }

    case 'plot': {
      if (!isPlotAnswer(answer)) return { kind: 'incorrect' };
      return answer.re === slide.answer.re && answer.im === slide.answer.im
        ? { kind: 'correct' }
        : { kind: 'incorrect' };
    }

    case 'slider': {
      // The range input hands back a string; anything else did not come from it.
      // Empty is a handle nobody has moved, and has to be refused by name:
      // `Number('')` is 0, which is a real answer on most tracks.
      if (typeof answer !== 'string' || answer.trim() === '') return { kind: 'incorrect' };
      const value = Number(answer);
      if (!Number.isFinite(value)) return { kind: 'incorrect' };
      // Half a step by default: the handle cannot stop between steps, so this
      // accepts the step the learner actually landed on and nothing further.
      const tolerance = slide.tolerance ?? slide.step / 2;
      return Math.abs(value - slide.answer) <= tolerance
        ? { kind: 'correct' }
        : { kind: 'incorrect' };
    }

    case 'tiles': {
      // Tiles always arrive as an array of tokens; anything else is not an answer.
      if (!Array.isArray(answer)) return { kind: 'incorrect' };
      const given = answer;
      if (given.length !== slide.answer.length || given.some((token) => token === '')) {
        return { kind: 'incorrect' };
      }
      if (slide.unordered) {
        // Compared element-wise rather than by joining: any separator character
        // is a guess about what tokens can contain, and this needs no guess.
        const sorted = (xs: string[]) => [...xs].sort();
        const mine = sorted(given);
        const theirs = sorted(slide.answer);
        return mine.every((token, idx) => token === theirs[idx])
          ? { kind: 'correct' }
          : { kind: 'incorrect' };
      }
      const same = given.every((token, idx) => token === slide.answer[idx]);
      return same ? { kind: 'correct' } : { kind: 'incorrect' };
    }

    case 'steps':
      return gradeSequence(answer, slide.reductions.map((step) => step.value));

    case 'tree':
      return gradeSequence(answer, slide.answer);

    /**
     * One number, held against what the expression comes to.
     *
     * No working to inspect, so there is nothing to grade but the answer — the
     * whole difficulty is that the learner had to get there unaided.
     */
    case 'evaluate': {
      if (typeof answer !== 'string' || answer.trim() === '') return { kind: 'incorrect' };
      return Math.abs(Number(answer) - valueOf(slide.expr)) < 1e-9
        ? { kind: 'correct' }
        : { kind: 'incorrect' };
    }

    /**
     * Re-walk the learner's reductions over the original expression.
     *
     * The whole grade is the replay: nothing is compared against an expected
     * sequence, so any order precedence allows passes, and a reduction taken
     * before its operands were settled fails whatever value came with it.
     */
    case 'reduce': {
      if (!Array.isArray(answer)) return { kind: 'incorrect' };
      const moves = answer.map(parseMove).filter((move): move is Move => move !== undefined);
      if (moves.length !== answer.length) return { kind: 'incorrect' };
      return isSolved(slide.expr, moves) ? { kind: 'correct' } : { kind: 'incorrect' };
    }

    // The path taken, fork by fork. A learner who turns the wrong way early
    // ends up somewhere else entirely, and `gradeSequence` refusing a
    // length mismatch is what makes a short wrong path wrong rather than a
    // prefix of a right one.
    case 'flow':
      return gradeSequence(answer, slide.answer);
  }
}

export function reduce(session: Session, action: Action): Session {
  const slide = currentSlide(session);

  switch (action.type) {
    case 'submit': {
      if (!slide || session.feedback.kind === 'correct') return session;
      const state = session.states[slide.id];

      const feedback = grade(
        slide.slide,
        action.answer,
        hashSeed(`${session.seed}:${slide.id}`),
      );

      // Unreadable input is not an attempt: an unclosed bracket should not cost
      // the learner their first-try credit.
      if (feedback.kind === 'invalid') return { ...session, feedback };

      const attempts = state.attempts + 1;
      const correct = feedback.kind === 'correct';

      return {
        ...session,
        feedback,
        states: {
          ...session.states,
          [slide.id]: {
            ...state,
            attempts,
            solved: state.solved || correct,
            firstTry: state.firstTry || (correct && attempts === 1 && !state.revealed),
          },
        },
      };
    }

    case 'edit': {
      // Touching the answer after a wrong verdict clears it, so a second
      // attempt costs no extra tap. Deliberately narrow: it cannot clear
      // `correct` (already passed) or `revealed` (the worked steps stay on
      // screen while you redo it), and it can never disclose anything, since
      // the only thing it does is return to `idle`.
      if (!slide) return session;
      const { kind } = session.feedback;
      // Unreadable input is always editable: nothing was graded, so refusing
      // it here would strand the learner on a typo they cannot correct.
      if (kind === 'invalid') return { ...session, feedback: { kind: 'idle' } };
      if (kind !== 'incorrect' || !canRetry(session)) return session;
      return { ...session, feedback: { kind: 'idle' } };
    }

    case 'tryAgain': {
      // Returns to the same slide with the same generated parameters.
      if (!slide || !canRetry(session)) return session;
      return { ...session, feedback: { kind: 'idle' } };
    }

    case 'reveal': {
      // Only reachable by explicit request, never as a consequence of answering.
      if (!slide || !canReveal(session)) return session;
      return {
        ...session,
        feedback: { kind: 'revealed', steps: slide.solution() },
        states: {
          ...session.states,
          [slide.id]: { ...session.states[slide.id], revealed: true },
        },
      };
    }

    case 'continue': {
      if (!slide) return session;
      const { kind } = session.feedback;
      const isTeach = slide.slide.kind === 'teach';
      // A wrong answer does not let you move on: try again, or ask to see it.
      // In an assessment there is no second attempt, so a wrong answer is a
      // finished question and the deck advances past it.
      const mayAdvance =
        isTeach ||
        kind === 'correct' ||
        kind === 'revealed' ||
        (session.assessment && kind === 'incorrect');
      if (!mayAdvance) return session;

      const deck = currentDeck(session);
      const last = session.index >= deck.length - 1;

      if (!last) {
        return { ...session, index: session.index + 1, feedback: { kind: 'idle' } };
      }
      if (session.phase === 'guided') {
        // One-way: from here the guided slides are out of reach.
        return { ...session, phase: 'skillCheck', index: 0, feedback: { kind: 'idle' } };
      }
      return { ...session, phase: 'summary', index: 0, feedback: { kind: 'idle' } };
    }

    case 'back': {
      if (!canGoBack(session)) return session;
      return { ...session, index: session.index - 1, feedback: { kind: 'idle' } };
    }
  }
}
