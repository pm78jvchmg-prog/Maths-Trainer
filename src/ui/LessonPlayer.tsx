/**
 * Drives one lesson from first slide to summary.
 *
 * The header changes shape between phases, mirroring the reference app: a
 * progress bar during the guided slides, three dots during the skill check. It
 * is not decoration — it is the visible signal that review is no longer
 * available.
 */
import { useReducer, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  startSession,
  reduce,
  currentSlide,
  currentDeck,
  canGoBack,
  canRetry,
  skillCheckScore,
  scorePercent,
} from '../engine/session';
import type { Answer } from '../engine/session';
import type { Lesson, GeneratorRegistry } from '../content/types';
import { SlideView, hasAnswer } from './slides';
import { FeedbackBar } from './FeedbackBar';
import { tapOnQuestion } from './questionTap';

interface Props {
  lesson: Lesson;
  registry: GeneratorRegistry;
  /** Fixed seed for reproducible runs; omit for a fresh draw each sitting. */
  seed?: number;
  onExit: () => void;
  onComplete: (score: { correct: number; total: number }) => void;
}

export function LessonPlayer({ lesson, registry, seed, onExit, onComplete }: Props) {
  const [session, dispatch] = useReducer(
    reduce,
    undefined,
    () => startSession(lesson, registry, seed),
  );
  const [answer, setAnswer] = useState<Answer>('');
  // Which way the deck last moved, so the incoming slide animates from the
  // side it came from rather than always from the right.
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  // What the widget made of the tap now bubbling to the question, if anything.
  // The question's handler was bound before that answer was committed, so this
  // is the only way it can tell a tap that chose something from a bare one.
  const answeredByTap = useRef<Answer | undefined>(undefined);

  const slide = currentSlide(session);
  const deck = currentDeck(session);

  if (session.phase === 'summary' || !slide) {
    const score = skillCheckScore(session);
    return (
      <div className="app">
        <div className="summary">
          <p className="lesson-meta">{lesson.title}</p>
          <div className="summary-score">
            {session.assessment ? `${scorePercent(session)}%` : `${score.correct}/${score.total}`}
          </div>
          <p className="lesson-meta">
            {session.assessment
              ? `${score.correct} of ${score.total} correct`
              : 'correct first time in the skill check'}
          </p>
        </div>
        <div className="footer">
          <button
            type="button"
            className="primary-button"
            onClick={() => onComplete(score)}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  const isSkillCheck = session.phase === 'skillCheck';
  const isTeach = slide.slide.kind === 'teach';
  // Working slides grow a line at a time, so they anchor to the top; anything
  // else sits low on the screen, within thumb reach.
  const grows =
    slide.slide.kind === 'steps' ||
    slide.slide.kind === 'tree' ||
    slide.slide.kind === 'order' ||
    slide.slide.kind === 'iterate';
  // A wrong answer the learner is still allowed to change. `canRetry` is the
  // same gate the widgets read, so a level check cannot pick up a second
  // attempt through this route either.
  const retryOnTap = session.feedback.kind === 'incorrect' && canRetry(session);
  const isLastQuestion = isSkillCheck && session.index === deck.length - 1;
  const progress = ((session.index + 1) / deck.length) * 100;

  const act = (action: Parameters<typeof reduce>[1]) => {
    dispatch(action);
    answeredByTap.current = undefined;
    if (action.type === 'continue' || action.type === 'back') {
      setDirection(action.type === 'back' ? 'back' : 'forward');
      setAnswer('');
    }
    // `tryAgain` keeps the draft: the widgets hold their own view of it (the
    // expression box, a slider's handle, a line of working), and clearing it
    // from out here left them showing an answer the player no longer had.
  };

  // Every answer change is also an edit, which is what lets a second attempt
  // start by simply changing the answer instead of pressing Try again.
  const changeAnswer = (next: Answer) => {
    dispatch({ type: 'edit' });
    setAnswer(next);
    answeredByTap.current = next;
  };

  const tapQuestion = () => {
    const tap = tapOnQuestion({
      feedback: session.feedback.kind,
      canRetry: canRetry(session),
      draft: answer,
      answered: answeredByTap.current,
    });
    answeredByTap.current = undefined;
    if (tap.retry) act({ type: 'tryAgain' });
    setAnswer(tap.draft);
  };

  return (
    <div className="app">
      <header className="lesson-header">
        <button type="button" className="icon-button" aria-label="Exit lesson" onClick={onExit}>
          &#215;
        </button>

        {isSkillCheck ? (
          <div
            className="dots"
            aria-label={`Question ${session.index + 1} of ${deck.length}`}
            style={{ '--count': deck.length } as CSSProperties}
          >
            {deck.map((_, idx) => (
              <span
                key={idx}
                className={`dot${idx < session.index ? ' done' : ''}${
                  idx === session.index ? ' active' : ''
                }`}
              />
            ))}
          </div>
        ) : (
          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* Review exists only in the guided phase; in the skill check the
            control is absent rather than merely disabled. */}
        {!isSkillCheck && (
          <button
            type="button"
            className="icon-button"
            aria-label="Previous slide"
            disabled={!canGoBack(session)}
            onClick={() => act({ type: 'back' })}
          >
            &#8249;
          </button>
        )}
      </header>

      {/* Keying on the slide id remounts the widget between questions, so no
          draft answer or keypad state can leak from one slide to the next.

          The whole question area clears a wrong verdict when tapped. Reaching
          the feedback bar to retry means moving your thumb to the bottom of the
          screen and back for every slip, when the thing you want to change is
          already under your finger — so any tap on the question counts as
          "let me have another go". It is guarded by `canRetry`, so inside a
          level check the tap does nothing and the one-attempt rule stands.
          A tap a widget has already turned into an answer is that retry, and
          the answer stands; see `tapOnQuestion`. */}
      <main
        className={`slide enter-${direction}${grows ? ' grow' : ''}${retryOnTap ? ' retryable' : ''}`}
        key={slide.id}
        onClick={retryOnTap ? tapQuestion : undefined}
      >
        {/* Only when stepping *back* onto a solved slide. While the verdict for
            this answer is still on screen, saying it was already solved reads
            as a comment on the answer just given rather than on the history. */}
        {session.states[slide.id]?.solved && session.feedback.kind === 'idle' && (
          <p className="lesson-meta">Already solved — answer again or continue.</p>
        )}
        <SlideView
          slide={slide.slide}
          id={slide.id}
          feedback={session.feedback}
          answer={answer}
          onAnswer={changeAnswer}
          canEdit={canRetry(session)}
        />
      </main>

      <FeedbackBar
        feedback={session.feedback}
        isTeach={isTeach}
        canSubmit={hasAnswer(slide.slide, answer)}
        isLastQuestion={isLastQuestion}
        assessment={session.assessment}
        onSubmit={() => act({ type: 'submit', answer })}
        onTryAgain={() => act({ type: 'tryAgain' })}
        onReveal={() => act({ type: 'reveal' })}
        onContinue={() => act({ type: 'continue' })}
      />
    </div>
  );
}
