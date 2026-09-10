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
): ResolvedSlide {
  if (ref.type === 'literal') {
    const steps = ref.solution ?? NO_SOLUTION;
    return { id, slide: ref.slide, solution: () => steps };
  }

  const generator = registry[ref.generatorId];
  if (!generator) throw new Error(`Unknown generator: ${ref.generatorId}`);

  // Seeded per slide, so the same session seed always rebuilds the same lesson.
  const rng = makeRng(hashSeed(`${seed}:${id}`));
  const params = generator.sample(rng, ref.difficulty ?? 1) as never;
  return {
    id,
    slide: generator.render(params),
    solution: () => generator.solution(params),
  };
}

export function startSession(
  lesson: Lesson,
  registry: GeneratorRegistry,
  seed: number = Date.now(),
): Session {
  const resolve = (refs: SlideRef[], tag: string) =>
    refs.map((ref, idx) => resolveRef(ref, `${lesson.id}:${tag}${idx}`, seed, registry));

  const guided = resolve(lesson.slides, 'g');
  const skillCheck = resolve(lesson.skillCheck, 's');

  const states: Record<string, SlideState> = {};
  for (const resolved of [...guided, ...skillCheck]) {
    states[resolved.id] = { attempts: 0, revealed: false, solved: false, firstTry: false };
  }

  return {
    lessonId: lesson.id,
    seed,
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
  return session.feedback.kind === 'incorrect';
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
      if (kind !== 'incorrect' && kind !== 'invalid') return session;
      return { ...session, feedback: { kind: 'idle' } };
    }

    case 'tryAgain': {
      // Returns to the same slide with the same generated parameters.
      if (!slide) return session;
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
      const mayAdvance = isTeach || kind === 'correct' || kind === 'revealed';
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
