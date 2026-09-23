/**
 * What a tap on the question does after a wrong answer.
 *
 * The whole question area is the retry target, so a tap anywhere on it clears
 * a wrong verdict. Most taps also land on a widget first — an option, a keypad
 * key, the slider track — and the widget turns that tap into an answer before
 * it bubbles up to the question. Both handlers run on the same click, and the
 * question's one was bound before the widget's answer was committed, so it
 * cannot see that answer in its own props.
 *
 * Held here rather than in `LessonPlayer`, so the decision can be tested
 * without a DOM.
 */
import type { Answer, Feedback } from '../engine/session';

export interface QuestionTap {
  /** Dispatch `tryAgain`: the tap cleared the verdict and chose nothing. */
  retry: boolean;
  /** The draft to hold once the tap is handled. */
  draft: Answer;
}

export function tapOnQuestion(input: {
  feedback: Feedback['kind'];
  /** `canRetry(session)`: false in a level check, where an answer is final. */
  canRetry: boolean;
  /** The draft as the question's handler last saw it. */
  draft: Answer;
  /** What the widget made of this same tap, if it made an answer of it. */
  answered: Answer | undefined;
}): QuestionTap {
  // The widget's answer is newer than anything the handler was bound with.
  const draft = input.answered ?? input.draft;
  if (input.feedback !== 'incorrect' || !input.canRetry) return { retry: false, draft };
  // The widget's `edit` has already cleared the verdict, and a `tryAgain` on
  // top would be harmless but is a second action for one tap.
  if (input.answered !== undefined) return { retry: false, draft };
  // A bare tap — empty space, the readout, a `steps` span being armed —
  // clears the verdict and leaves the answer where it was, to be changed.
  // Clearing the draft here would put a string where a tiles or tree widget
  // holds an array, and send a slider's handle back to rest.
  return { retry: true, draft };
}
