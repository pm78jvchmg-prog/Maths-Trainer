// @vitest-environment happy-dom
/**
 * The lesson player, rendered.
 *
 * The session tests hold the reducer to the three invariants; these hold the
 * screen to them. They exist because a rule can be right in the reducer and
 * still be routed around by what the player draws — the back-navigation bug
 * got through with every reducer test green.
 *
 * Written with `createElement` rather than JSX so the file is a plain `.ts`
 * test like every other one here.
 */
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LessonPlayer } from './LessonPlayer';
import type { Lesson, SlideRef } from '../content/types';

afterEach(cleanup);

/** Written into every solution, so a disclosure is a string search away. */
const WORKING = 'Worked solution:';

function choice(question: string, correctId: 'yes' | 'no'): SlideRef {
  return {
    type: 'literal',
    slide: {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: question }],
      options: [
        { id: 'yes', label: 'Yes' },
        { id: 'no', label: 'No' },
      ],
      correctId,
    },
    solution: [{ text: `${WORKING} the answer to "${question}" is ${correctId}.` }],
  };
}

function teach(text: string): SlideRef {
  return { type: 'literal', slide: { kind: 'teach', body: [{ kind: 'prose', text }] } };
}

const FIRST = 'Does x squared equal minus one for some real x?';
const SECOND = 'Is 2 an even number?';
const CHECK_1 = 'Is 3 an even number?';
const CHECK_2 = 'Is 4 an even number?';

const lesson: Lesson = {
  id: 'player-test',
  title: 'Player test',
  slides: [choice(FIRST, 'no'), choice(SECOND, 'yes')],
  skillCheck: [choice(CHECK_1, 'no'), choice(CHECK_2, 'yes')],
};

const levelCheck: Lesson = {
  id: 'player-test-level',
  title: 'Player test level check',
  assessment: true,
  slides: [],
  skillCheck: [choice(CHECK_1, 'no'), choice(CHECK_2, 'yes')],
};

function play(which: Lesson) {
  const onExit = vi.fn();
  render(
    createElement(LessonPlayer, {
      lesson: which,
      registry: {},
      seed: 1,
      onExit,
      onComplete: vi.fn(),
    }),
  );
  return { onExit };
}

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const maybeButton = (name: string | RegExp) => screen.queryByRole('button', { name });
const tap = (name: string | RegExp) => fireEvent.click(button(name));

/** Pick an option and check it. */
function answer(option: 'Yes' | 'No') {
  tap(option);
  tap('Check');
}

describe('a wrong answer', () => {
  it('offers only Show me, and shows neither the answer nor the working', () => {
    play(lesson);
    answer('Yes');

    expect(screen.getByText('Not quite.', { selector: '.footer-title' })).toBeTruthy();
    expect(button('Show me')).toBeTruthy();
    expect(screen.getByText('Tap the question to try again.')).toBeTruthy();
    // No way on, and no second control for the retry.
    expect(maybeButton('Continue')).toBeNull();
    expect(maybeButton('Try again')).toBeNull();

    // The chosen option is marked wrong; the right one is not marked at all.
    expect(button('Yes').className).toContain('wrong');
    expect(button('No').className).not.toContain('correct');
    expect(document.querySelector('.correct')).toBeNull();
    expect(screen.queryByText(new RegExp(WORKING))).toBeNull();
  });

  it('shows the working only once Show me is tapped', () => {
    play(lesson);
    answer('Yes');
    expect(screen.queryByText(new RegExp(WORKING))).toBeNull();

    tap('Show me');
    expect(screen.getByText(new RegExp(WORKING))).toBeTruthy();
  });
});

describe('stepping back onto a solved slide', () => {
  it('offers Continue, and Continue moves on without answering again', () => {
    play(lesson);
    answer('No');
    tap('Continue');
    expect(screen.getByText(SECOND)).toBeTruthy();

    tap('Previous slide');
    expect(screen.getByText(FIRST)).toBeTruthy();
    expect(screen.getByText('Already solved — answer again or continue.')).toBeTruthy();

    tap('Continue');
    expect(screen.getByText(SECOND)).toBeTruthy();
    expect(screen.queryByText(FIRST)).toBeNull();
  });
});

describe('the skill check', () => {
  it('has no back control in the DOM', () => {
    play(lesson);
    // Present in the guided phase, so its absence below is the seal.
    expect(button('Previous slide')).toBeTruthy();

    answer('No');
    tap('Continue');
    answer('Yes');
    tap('Continue');
    expect(screen.getByText(CHECK_1)).toBeTruthy();
    expect(maybeButton('Previous slide')).toBeNull();

    answer('No');
    tap('Continue');
    expect(screen.getByText(CHECK_2)).toBeTruthy();
    expect(maybeButton('Previous slide')).toBeNull();
  });
});

describe('the question dots', () => {
  it('fill a past question only if it scored', () => {
    const threeQuestions: Lesson = {
      id: 'player-test-dots',
      title: 'Player test dots',
      assessment: true,
      slides: [],
      skillCheck: [choice(CHECK_1, 'no'), choice(CHECK_2, 'yes'), choice(FIRST, 'no')],
    };
    play(threeQuestions);
    answer('Yes'); // wrong
    tap('Continue');
    answer('Yes'); // right
    tap('Continue');

    const dots = [...document.querySelectorAll('.dot')].map((dot) => dot.className);
    expect(dots).toEqual(['dot missed', 'dot done', 'dot active']);
  });
});

describe('leaving', () => {
  it('asks before a level check is abandoned, and staying keeps the question', () => {
    const { onExit } = play(levelCheck);
    tap('Exit lesson');

    expect(screen.getByText('Leave the level check?')).toBeTruthy();
    expect(onExit).not.toHaveBeenCalled();

    tap('Keep going');
    expect(screen.queryByText('Leave the level check?')).toBeNull();
    expect(screen.getByText(CHECK_1)).toBeTruthy();
    expect(onExit).not.toHaveBeenCalled();

    tap('Exit lesson');
    tap('Leave');
    expect(onExit).toHaveBeenCalledWith(true);
  });

  it('leaves a guided slide in one tap, without asking', () => {
    const { onExit } = play(lesson);
    tap('Exit lesson');

    expect(onExit).toHaveBeenCalledWith(false);
    expect(screen.queryByText(/Leave the/)).toBeNull();
  });
});

describe('the answer box', () => {
  it('opens at its prefill when stepped back onto, even after it was emptied', () => {
    const prefilled: Lesson = {
      id: 'player-test-prefill',
      title: 'Player test prefill',
      slides: [
        {
          type: 'literal',
          slide: {
            kind: 'expression',
            prompt: [{ kind: 'prose', text: 'What is 2 + 3?' }],
            keypad: [],
            prefill: [{ insert: '2' }],
            answer: '5',
            domain: 'real',
            mode: 'exact',
          },
        },
        teach('Next.'),
      ],
      skillCheck: [choice(CHECK_1, 'no')],
    };
    const slot = () => document.querySelector('.answer-frame .answer-slot');

    play(prefilled);
    expect(slot()?.className).toContain('filled');
    tap('+');
    tap('3');
    tap('Check');
    tap('Continue');
    tap('Previous slide');

    // Empty the box, then pass the solved slide and come back to it.
    tap('Delete');
    expect(slot()?.className).not.toContain('filled');
    tap('Continue');
    expect(screen.getByText('Next.')).toBeTruthy();
    tap('Previous slide');

    expect(slot()?.className).toContain('filled');
  });
});
