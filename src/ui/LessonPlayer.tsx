/**
 * Drives one lesson from first slide to summary.
 *
 * The header changes shape between phases, mirroring the reference app: a
 * progress bar during the guided slides, three dots during the skill check. It
 * is not decoration — it is the visible signal that review is no longer
 * available.
 */
import { useEffect, useId, useReducer, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  startSession,
  reduce,
  currentSlide,
  currentDeck,
  canGoBack,
  canPassFinished,
  canRetry,
  skillCheckScore,
  scorePercent,
} from '../engine/session';
import type { Answer } from '../engine/session';
import type { Lesson, GeneratorRegistry } from '../content/types';
import { SlideView } from './SlideView';
import { hasAnswer } from './slides';
import { FeedbackBar, VerdictAnnouncer } from './FeedbackBar';
import { tapOnQuestion } from './questionTap';
import { useHidingBar } from './hidingBar';

interface Props {
  lesson: Lesson;
  registry: GeneratorRegistry;
  /** Fixed seed for reproducible runs; omit for a fresh draw each sitting. */
  seed?: number;
  /**
   * Leaves without finishing. `abandoned` is true when a skill check or level
   * check was under way, so the attempt can be counted as walked away from.
   */
  onExit: (abandoned: boolean) => void;
  onComplete: (score: { correct: number; total: number }) => void;
}

/**
 * Asks before a sealed check is abandoned.
 *
 * Only ever shown once the guided slides are behind the learner. Leaving a
 * guided slide costs nothing worth asking about, but the exit control sits in
 * the corner a thumb brushes on the way to the question, and one stray tap
 * partway through a fifteen-question level check used to throw the whole run
 * away without a word.
 *
 * A native modal `<dialog>` rather than `window.confirm`, so it is styled like
 * the rest of the app, and rather than a hand-rolled overlay, because
 * `showModal` makes the lesson behind it inert and closes on Escape for free.
 * It dispatches nothing: staying leaves the session exactly as it was.
 */
function ConfirmLeave({
  assessment,
  onStay,
  onLeave,
}: {
  assessment: boolean;
  onStay: () => void;
  onLeave: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // `close` hands focus back to the exit control before the dialog unmounts.
  const stay = () => {
    ref.current?.close();
    onStay();
  };

  return (
    <dialog
      ref={ref}
      className="leave-dialog"
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={onStay}
      // The sheet fills the dialog, so a click landing on the dialog element
      // itself is a tap on the dimmed backdrop around it.
      onClick={(event) => {
        if (event.target === event.currentTarget) stay();
      }}
    >
      <div className="leave-sheet">
        <h2 className="leave-title" id={titleId}>
          {assessment ? 'Leave the level check?' : 'Leave the skill check?'}
        </h2>
        <p className="leave-body" id={bodyId}>
          Your answers so far won&rsquo;t count.
        </p>
        <button type="button" className="primary-button" onClick={stay}>
          Keep going
        </button>
        <button type="button" className="ghost-button" onClick={onLeave}>
          Leave
        </button>
      </div>
    </dialog>
  );
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
  // Whether the exit control is waiting on "Leave the check?". Never set during
  // the guided slides, which the control still leaves in one tap.
  const [confirmingExit, setConfirmingExit] = useState(false);
  // The header slides away while a long slide is scrolled down and comes back
  // on scrolling up. Every new slide starts with it showing.
  const bar = useHidingBar(24);

  const slide = currentSlide(session);
  const deck = currentDeck(session);
  const slideId = slide?.id;
  const { show } = bar;
  useEffect(() => {
    show();
  }, [slideId, show]);

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
  // start by simply changing the answer instead of tapping to retry first.
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
    <div className="app app-lesson">
      <header className={`lesson-header${bar.hidden ? ' hidden' : ''}`}>
        <button
          type="button"
          className="icon-button"
          aria-label="Exit lesson"
          onClick={() => (session.phase === 'guided' ? onExit(false) : setConfirmingExit(true))}
        >
          &#215;
        </button>

        {isSkillCheck ? (
          <div
            className="dots"
            aria-label={`Question ${session.index + 1} of ${deck.length}`}
            style={{ '--count': deck.length } as CSSProperties}
          >
            {/* A past question is mint only if it scored, the same test as the
                summary's count (`firstTry`); one that did not is a hollow ring,
                so the difference is not carried by colour alone. Nothing here
                says more than the verdict bar already did. */}
            {deck.map((item, idx) => {
              const past = idx < session.index;
              const scored = past && session.states[item.id]?.firstTry === true;
              return (
                <span
                  key={idx}
                  className={`dot${past ? (scored ? ' done' : ' missed') : ''}${
                    idx === session.index ? ' active' : ''
                  }`}
                />
              );
            })}
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
        onScroll={bar.onScroll}
      >
        {/* Only when stepping *back* onto a finished slide. While the verdict
            for this answer is still on screen, saying it was already solved
            reads as a comment on the answer just given rather than on the
            history. A slide whose answer was shown comes back showing it, so
            this line appears there only after Try again. */}
        {canPassFinished(session) && (
          <p className="lesson-meta">
            {session.states[slide.id]?.solved
              ? 'Already solved — answer again or continue.'
              : 'Answer already shown — try it or continue.'}
          </p>
        )}
        <SlideView
          slide={slide.slide}
          feedback={session.feedback}
          answer={answer}
          onAnswer={changeAnswer}
          canEdit={canRetry(session)}
        />
      </main>

      <VerdictAnnouncer feedback={session.feedback} />
      <FeedbackBar
        feedback={session.feedback}
        isTeach={isTeach}
        canSubmit={hasAnswer(slide.slide, answer)}
        isLastQuestion={isLastQuestion}
        assessment={session.assessment}
        canPass={canPassFinished(session)}
        onSubmit={() => act({ type: 'submit', answer })}
        onTryAgain={() => act({ type: 'tryAgain' })}
        onReveal={() => act({ type: 'reveal' })}
        onContinue={() => act({ type: 'continue' })}
      />

      {confirmingExit && (
        <ConfirmLeave
          assessment={session.assessment}
          onStay={() => setConfirmingExit(false)}
          onLeave={() => onExit(true)}
        />
      )}
    </div>
  );
}
