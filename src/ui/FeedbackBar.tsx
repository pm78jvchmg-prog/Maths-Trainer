/**
 * The bar along the bottom of a lesson.
 *
 * The rule that matters: a wrong answer shows "Not quite." and offers *Show me*
 * beside *Try again*. It never prints the answer. The reveal is a deliberate
 * second tap, and the worked steps only appear once the reducer has moved to
 * the `revealed` state.
 */
import { Blocks, Tex } from './Math';
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
  onSubmit: () => void;
  onTryAgain: () => void;
  onReveal: () => void;
  onContinue: () => void;
}

function Solution({ steps }: { steps: SolutionStep[] }) {
  if (steps.length === 0) {
    return <p className="invalid-note">No worked solution for this one.</p>;
  }
  return (
    <div className="solution">
      {steps.map((step, idx) => (
        <div key={idx} className="solution-step">
          {step.text && <Blocks blocks={[{ kind: 'prose', text: step.text }]} />}
          {step.tex && (
            <div className="display-math">
              <Tex tex={step.tex} display />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function FeedbackBar({
  feedback,
  isTeach,
  canSubmit,
  isLastQuestion,
  assessment,
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
      return (
        <div className="footer wrong">
          <div className="footer-head">
            <span className="footer-title">Not quite.</span>
            <button type="button" className="ghost-button" onClick={onReveal}>
              Show me
            </button>
          </div>
          <button type="button" className="primary-button" onClick={onTryAgain}>
            Try again
          </button>
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
