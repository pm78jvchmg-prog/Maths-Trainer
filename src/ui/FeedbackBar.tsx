/**
 * The bar along the bottom of a lesson.
 *
 * The rule that matters: a wrong answer shows "Not quite." and offers only
 * *Show me*; retrying is a tap on the question (`tapOnQuestion`), and
 * *Try again* appears only once the worked steps are showing. It never prints
 * the answer. The reveal is a deliberate
 * second tap, and the worked steps only appear once the reducer has moved to
 * the `revealed` state.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { Blocks, DisplayMath } from './Math';
import { packPages } from './solutionPages';
import type { Feedback } from '../engine/session';
import type { SolutionStep } from '../content/types';

interface Props {
  feedback: Feedback;
  /** True on a teaching slide, where the only control is Continue. */
  isTeach: boolean;
  /** False when the draft answer is incomplete, which disables Check. */
  canSubmit: boolean;
  /** Hidden on the final skill-check question, where the button says Finish. */
  isLastQuestion: boolean;
  /**
   * One attempt per question, no worked solutions.
   *
   * A wrong answer here is a finished question, so the bar offers only the way
   * onwards — there is deliberately no Try again and no Show me to hunt for.
   */
  assessment: boolean;
  /**
   * A guided slide already solved, stepped back onto for review: Continue is
   * offered beside Check, so reviewing it does not mean answering it again.
   * Read from `canPassSolved`, the same gate the reducer applies.
   */
  canPass: boolean;
  onSubmit: () => void;
  onTryAgain: () => void;
  onReveal: () => void;
  onContinue: () => void;
}

/** Vertical room one page of a worked solution may take, as a share of the window. */
const PAGE_SHARE = 0.28;
function Step({ step }: { step: SolutionStep }) {
  return (
    <div className="solution-step">
      {step.text && <Blocks blocks={[{ kind: 'prose', text: step.text }]} />}
      {step.tex && (
        <DisplayMath tex={step.tex} />
      )}
    </div>
  );
}

/**
 * The worked solution, as pages you swipe through sideways.
 *
 * Laid out as one long column it took most of the screen and pushed the
 * question it explains off the top. Now it holds to a fixed share of the
 * window: the steps are measured once, off screen, and packed in order into
 * pages that fit, and the pages sit side by side and snap like a photo roll.
 * Dots under it say how many there are and which one is showing.
 */
function Solution({ steps }: { steps: SolutionStep[] }) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<number[][] | null>(null);
  const [current, setCurrent] = useState(0);

  useLayoutEffect(() => {
    const box = measureRef.current;
    if (!box) return;
    const heights = [...box.children].map((child) => (child as HTMLElement).offsetHeight);
    setPages(packPages(heights, Math.round(window.innerHeight * PAGE_SHARE)));
  }, [steps]);

  if (steps.length === 0) {
    return <p className="invalid-note">No worked solution for this one.</p>;
  }

  if (!pages) {
    return (
      <div className="solution">
        <div className="solution-measure" ref={measureRef} aria-hidden="true">
          {steps.map((step, idx) => (
            <Step key={idx} step={step} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="solution">
      <div
        className="solution-pages"
        onScroll={(event) => {
          const row = event.currentTarget;
          setCurrent(Math.round(row.scrollLeft / Math.max(1, row.clientWidth)));
        }}
      >
        {pages.map((page, pageIdx) => (
          <div key={pageIdx} className="solution-page">
            {page.map((idx) => (
              <Step key={idx} step={steps[idx]} />
            ))}
          </div>
        ))}
      </div>
      {pages.length > 1 && (
        <div className="solution-dots" aria-label={`Page ${current + 1} of ${pages.length}`}>
          {pages.map((_, idx) => (
            <span key={idx} className={`solution-dot${idx === current ? ' active' : ''}`} />
          ))}
          <span className="solution-more">{current < pages.length - 1 ? 'Swipe for more' : ''}</span>
        </div>
      )}
    </div>
  );
}

export function FeedbackBar({
  feedback,
  isTeach,
  canSubmit,
  isLastQuestion,
  assessment,
  canPass,
  onSubmit,
  onTryAgain,
  onReveal,
  onContinue,
}: Props) {
  const advanceLabel = isLastQuestion ? 'Finish' : 'Continue';

  if (isTeach) {
    return (
      <div className="footer">
        <button type="button" className="primary-button" onClick={onContinue}>
          Continue
        </button>
      </div>
    );
  }

  switch (feedback.kind) {
    case 'idle':
      return (
        <div className="footer">
          {canPass && (
            <div className="footer-head">
              <button type="button" className="ghost-button" onClick={onContinue}>
                {advanceLabel}
              </button>
            </div>
          )}
          <button
            type="button"
            className="primary-button"
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            Check
          </button>
        </div>
      );

    case 'invalid':
      // Not a wrong answer: the input could not be read, so no attempt is spent.
      return (
        <div className="footer">
          <p className="invalid-note">{feedback.message}</p>
          <button
            type="button"
            className="primary-button"
            disabled={!canSubmit}
            onClick={onSubmit}
          >
            Check
          </button>
        </div>
      );

    case 'correct':
      return (
        <div className="footer correct">
          <div className="footer-head">
            <span className="footer-title">Correct</span>
          </div>
          <button type="button" className="primary-button" onClick={onContinue}>
            {advanceLabel}
          </button>
        </div>
      );

    case 'incorrect':
      if (assessment) {
        return (
          <div className="footer wrong">
            <div className="footer-head">
              <span className="footer-title">Not quite.</span>
            </div>
            <button type="button" className="primary-button" onClick={onContinue}>
              {advanceLabel}
            </button>
          </div>
        );
      }
      // No Try again button here: the whole question is the retry target, and a
      // button repeating that is a second control for one action — the reach to
      // the bottom of the screen this was meant to remove. The line replacing it
      // says the gesture exists, which a bare tap target cannot.
      return (
        <div className="footer wrong">
          <div className="footer-head">
            <span className="footer-title">Not quite.</span>
            <button type="button" className="ghost-button" onClick={onReveal}>
              Show me
            </button>
          </div>
          <p className="footer-hint">Tap the question to try again.</p>
        </div>
      );

    case 'revealed':
      return (
        <div className="footer wrong">
          <div className="footer-head">
            <span className="footer-title">Here is how</span>
            <button type="button" className="ghost-button" onClick={onTryAgain}>
              Try again
            </button>
          </div>
          <Solution steps={feedback.steps} />
          <button type="button" className="primary-button" onClick={onContinue}>
            {advanceLabel}
          </button>
        </div>
      );
  }
}

/**
 * The verdict, said aloud.
 *
 * The bar above is rebuilt for every verdict, and a live region only speaks
 * reliably when it is already in the page before its words change; one that
 * arrives together with its text is often passed over. So this is a separate
 * status line that is always present and holds nothing but the verdict, read
 * out when a check lands without the learner having to find the footer. It is
 * visually hidden, since the bar already shows the same words, and it says no
 * more than the bar does: never the answer, never the worked steps.
 */
export function VerdictAnnouncer({ feedback }: { feedback: Feedback }) {
  const said = (() => {
    switch (feedback.kind) {
      case 'correct':
        return 'Correct';
      case 'incorrect':
        return 'Not quite.';
      case 'invalid':
        return feedback.message;
      case 'revealed':
        return 'Here is how';
      case 'idle':
        return '';
    }
  })();

  return (
    <div className="visually-hidden" role="status" aria-live="polite">
      {said}
    </div>
  );
}
