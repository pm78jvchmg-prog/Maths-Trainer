// @vitest-environment happy-dom
/**
 * The complex plane from a keyboard.
 *
 * Every point used to be its own tab stop, so a 9 by 9 plane took 81 Tab
 * presses to get past. The plane is now one stop, and the arrow keys move
 * across it.
 *
 * Written with `createElement` rather than JSX so the file is a plain `.ts`
 * test like every other one here.
 */
import { createElement, useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { SlideView } from './SlideView';
import type { Slide } from '../content/types';
import type { Answer, Feedback } from '../engine/session';

afterEach(cleanup);

const slide: Slide = {
  kind: 'plot',
  prompt: [{ kind: 'prose', text: 'Plot 1 - i.' }],
  range: 4,
  answer: { re: 1, im: -1 },
};

function Player({ feedback }: { feedback: Feedback }) {
  const [answer, setAnswer] = useState<Answer>('');
  return createElement(SlideView, { slide, feedback, answer, onAnswer: setAnswer, canEdit: true });
}

const points = () => [...document.querySelectorAll<SVGElement>('.plot-hits circle[role="button"]')];
const stops = () =>
  points()
    .filter((point) => point.getAttribute('tabindex') === '0')
    .map((point) => point.getAttribute('aria-label'));
const focused = () => document.activeElement?.getAttribute('aria-label');
const point = (label: string) => points().find((p) => p.getAttribute('aria-label') === label)!;
const key = (label: string, name: string) => fireEvent.keyDown(point(label), { key: name });

describe('the complex plane from a keyboard', () => {
  it('is one tab stop, at the origin before anything is chosen', () => {
    render(createElement(Player, { feedback: { kind: 'idle' } }));
    expect(points()).toHaveLength(81);
    expect(stops()).toEqual(['Point 0']);
  });

  it('moves the stop and the focus with the arrow keys, clamped at the edge', () => {
    render(createElement(Player, { feedback: { kind: 'idle' } }));
    key('Point 0', 'ArrowRight');
    expect(focused()).toBe('Point 1');
    expect(stops()).toEqual(['Point 1']);
    key('Point 1', 'ArrowDown');
    expect(focused()).toBe('Point 1 − i');
    key('Point 1 − i', 'End');
    expect(focused()).toBe('Point 4 − i');
    key('Point 4 − i', 'ArrowRight');
    expect(focused()).toBe('Point 4 − i');
    key('Point 4 − i', 'Home');
    expect(focused()).toBe('Point −4 − i');
    expect(stops()).toEqual(['Point −4 − i']);
  });

  it('chooses with Enter or Space, and the chosen point is then the stop', () => {
    render(createElement(Player, { feedback: { kind: 'idle' } }));
    key('Point 0', 'ArrowUp');
    key('Point i', 'Enter');
    expect(point('Point i').getAttribute('aria-pressed')).toBe('true');
    key('Point i', 'ArrowRight');
    key('Point 1 + i', ' ');
    expect(point('Point 1 + i').getAttribute('aria-pressed')).toBe('true');
    expect(point('Point i').getAttribute('aria-pressed')).toBe('false');
    expect(stops()).toEqual(['Point 1 + i']);
  });

  it('moves the stop to a point chosen by tapping', () => {
    render(createElement(Player, { feedback: { kind: 'idle' } }));
    fireEvent.click(point('Point −2 + 3i'));
    expect(point('Point −2 + 3i').getAttribute('aria-pressed')).toBe('true');
    expect(stops()).toEqual(['Point −2 + 3i']);
  });

  it('leaves the tab order entirely once the answer is locked', () => {
    render(createElement(Player, { feedback: { kind: 'correct' } }));
    expect(stops()).toEqual([]);
  });
});
