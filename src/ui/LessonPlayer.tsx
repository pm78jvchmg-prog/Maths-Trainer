/**
 * Drives one lesson from first slide to summary.
 *
 * The header changes shape between phases, mirroring the reference app: a
 * progress bar during the guided slides, three dots during the skill check. It
 * is not decoration — it is the visible signal that review is no longer
 * available.
 */
import { useReducer, useState } from 'react';
import {
  startSession,
  reduce,
  currentSlide,
  currentDeck,
  canGoBack,
  skillCheckScore,
} from '../engine/session';
import type { Answer } from '../engine/session';
import type { Lesson, GeneratorRegistry } from '../content/types';
import { SlideView, hasAnswer } from './slides';
import { FeedbackBar } from './FeedbackBar';

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

  const slide = currentSlide(session);
  const deck = currentDeck(session);

  if (session.phase === 'summary' || !slide) {
    const score = skillCheckScore(session);
    return (
      <div className="app">
        <div className="summary">
          <p className="lesson-meta">{lesson.title}</p>
          <div className="summary-score">
            {score.correct}/{score.total}
          </div>
          <p className="lesson-meta">correct first time in the skill check</p>
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
  const grows = slide.slide.kind === 'steps' || slide.slide.kind === 'tree';
  const isLastQuestion = isSkillCheck && session.index === deck.length - 1;
  const progress = ((session.index + 1) / deck.length) * 100;

  const act = (action: Parameters<typeof reduce>[1]) => {
    dispatch(action);
    if (action.type === 'continue' || action.type === 'back') {
      setDirection(action.type === 'back' ? 'back' : 'forward');
    }
    if (action.type === 'continue' || action.type === 'back' || action.type === 'tryAgain') {
      setAnswer('');
    }
  };

  // Every answer change is also an edit, which is what lets a second attempt
  // start by simply changing the answer instead of pressing Try again.
  const changeAnswer = (next: Answer) => {
    dispatch({ type: 'edit' });
    setAnswer(next);
  };

  return (
    <div className="app">
      <header className="lesson-header">
        <button type="button" className="icon-button" aria-label="Exit lesson" onClick={onExit}>
          &#215;
        </button>

        {isSkillCheck ? (
          <div className="dots" aria-label={`Question ${session.index + 1} of ${deck.length}`}>
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
          draft answer or keypad state can leak from one slide to the next. */}
      <main
        className={`slide enter-${direction}${grows ? ' grow' : ''}`}
        key={slide.id}
      >
        <SlideView
          slide={slide.slide}
          feedback={session.feedback}
          answer={answer}
          onAnswer={changeAnswer}
        />
      </main>

      <FeedbackBar
        feedback={session.feedback}
        isTeach={isTeach}
        canSubmit={hasAnswer(slide.slide, answer)}
        isLastQuestion={isLastQuestion}
        onSubmit={() => act({ type: 'submit', answer })}
        onTryAgain={() => act({ type: 'tryAgain' })}
        onReveal={() => act({ type: 'reveal' })}
        onContinue={() => act({ type: 'continue' })}
      />
    </div>
  );
}
