// @vitest-environment happy-dom
/**
 * Every button every widget draws has a name a screen reader can say.
 *
 * KaTeX marks what it draws `aria-hidden` and leaves the accessible copy to a
 * MathML tree Chromium does not use when it names a button, so a button whose
 * only content is `<Tex>` (a bank tile, a filled blank, a tappable piece of a
 * line) came out with an empty name, or read a blank as a lone space. happy-dom
 * would find a name in that MathML where Chromium does not, so the name is
 * worked out here the way Chromium does it: the `aria-label` if there is one,
 * otherwise the text left once every KaTeX render is taken out.
 *
 * Each widget is drawn, then driven the way a learner would — a piece tapped,
 * tiles placed — so blanks are checked both empty and filled.
 *
 * Written with `createElement` rather than JSX so the file is a plain `.ts`
 * test like every other one here.
 */
import { createElement, useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { SlideView } from './SlideView';
import { registeredGenerators } from '../content/registry';
import { makeRng } from '../engine/rng';
import type { Generator, Slide } from '../content/types';
import type { Answer } from '../engine/session';

afterEach(cleanup);

/** The name Chromium gives a button: its label, else its text outside KaTeX. */
function chromiumName(button: HTMLElement): string {
  const label = button.getAttribute('aria-label');
  if (label !== null) return label.trim();
  const copy = button.cloneNode(true) as HTMLElement;
  for (const katex of copy.querySelectorAll('.katex')) katex.remove();
  return (copy.textContent ?? '').trim();
}

// A backslash, a caret or an underscore is TeX a screen reader would spell out.
const leftoverTex = /[\\^_]/;

/**
 * What is wrong with the buttons on screen. A button with maths in it and no
 * label is wrong even when it has some text: the maths drops out of its name,
 * so "The midpoints of $AC$ and $BD$" is read as "The midpoints of and".
 */
function problems(container: HTMLElement, stage: string): string[] {
  return [...container.querySelectorAll<HTMLElement>('button')].flatMap((button) => {
    const name = chromiumName(button);
    if (name === '') return [`${stage}: unnamed .${button.className}`];
    if (leftoverTex.test(name)) return [`${stage}: "${name}" on .${button.className}`];
    if (!button.hasAttribute('aria-label') && button.querySelector('.katex')) {
      return [`${stage}: maths left out of "${name}" on .${button.className}`];
    }
    return [];
  });
}

/** Tap the first enabled button matching `selector`, if there is one. */
function tapFirst(container: HTMLElement, selector: string): boolean {
  const button = [...container.querySelectorAll<HTMLButtonElement>(selector)].find(
    (candidate) => !candidate.disabled,
  );
  if (!button) return false;
  fireEvent.click(button);
  return true;
}

function Player({ slide }: { slide: Slide }) {
  const [answer, setAnswer] = useState<Answer>('');
  return createElement(SlideView, {
    slide,
    feedback: { kind: 'idle' },
    answer,
    onAnswer: setAnswer,
    canEdit: true,
  });
}

/** The widgets whose buttons can hold maths alone, and how a learner drives each. */
const DRIVE: Partial<Record<Slide['kind'], (container: HTMLElement, check: (stage: string) => void) => void>> = {
  tiles: fillFromBank,
  table: fillFromBank,
  iterate: fillFromBank,
  tree: fillFromBank,
  venn: fillFromBank,
  forces: fillFromBank,
  probTree: (container, check) => {
    if (tapFirst(container, '.ptree-pick')) check('path chosen');
    fillFromBank(container, check);
  },
  order: (container, check) => {
    placeAll(container, '.proof-bank .tile');
    check('placed');
  },
  evaluate: (container, check) => {
    tapFirst(container, '.tile-bank .tile');
    check('chosen');
  },
  flow: (container, check) => {
    if (tapFirst(container, '.flow-branch')) check('one fork taken');
  },
  steps: (container, check) => {
    if (!tapFirst(container, '.step-target')) return;
    check('armed');
    tapFirst(container, '.tile-bank .tile');
    check('one step taken');
  },
  reduce: (container, check) => {
    if (!tapFirst(container, '.reduce-handle')) return;
    check('armed');
    tapFirst(container, '.tile-bank .tile');
    check('one step taken');
  },
};

const enabled = (container: HTMLElement, selector: string) =>
  [...container.querySelectorAll<HTMLButtonElement>(selector)].filter((button) => !button.disabled)
    .length;

/**
 * Tap tiles until none is left or a tap places nothing: a bank with more tiles
 * than blanks keeps its spares live once every blank is full.
 */
function placeAll(container: HTMLElement, selector: string) {
  for (let left = enabled(container, selector); left > 0; ) {
    tapFirst(container, selector);
    const now = enabled(container, selector);
    if (now >= left) return;
    left = now;
  }
}

function fillFromBank(container: HTMLElement, check: (stage: string) => void) {
  if (!tapFirst(container, '.tile-bank .tile')) return;
  check('one placed');
  placeAll(container, '.tile-bank .tile');
  check('all placed');
}

/**
 * A few generators per widget (and per mode, where a widget has two) rather
 * than all of them: this checks that each widget names its buttons, which one
 * draw shows as well as a hundred. Whether every token in the content reads
 * cleanly is the sweep in `texSpeech.test.ts`, which needs no DOM.
 */
const PER_WIDGET = 3;

describe('the name of every button on a widget that can hold maths alone', () => {
  const byKind = new Map<string, { id: string; slide: Slide }[]>();
  const perMode = new Map<string, number>();
  for (const generator of registeredGenerators as Generator<unknown>[]) {
    const slide = generator.render(generator.sample(makeRng(1), 1));
    if (!DRIVE[slide.kind]) continue;
    const mode = `${slide.kind} ${'mode' in slide ? slide.mode : ''}`;
    if ((perMode.get(mode) ?? 0) >= PER_WIDGET) continue;
    perMode.set(mode, (perMode.get(mode) ?? 0) + 1);
    byKind.set(slide.kind, [...(byKind.get(slide.kind) ?? []), { id: generator.id, slide }]);
  }

  it('covers every such widget', () => {
    expect([...byKind.keys()].sort()).toEqual(Object.keys(DRIVE).sort());
  });

  it.each([...byKind.keys()].sort())('%s: named in words, empty or filled', (kind) => {
    const found: string[] = [];
    for (const { id, slide } of byKind.get(kind)!) {
      const { container, unmount } = render(createElement(Player, { slide }));
      const check = (stage: string) => found.push(...problems(container, `${id}, ${stage}`));
      check('as drawn');
      DRIVE[kind as Slide['kind']]!(container, check);
      unmount();
    }
    expect(found.slice(0, 10)).toEqual([]);
  });

  it('names a blank for what the learner put there, never what belongs in it', () => {
    for (const kind of ['tiles', 'tree', 'iterate', 'venn', 'forces', 'probTree']) {
      for (const { id, slide } of byKind.get(kind) ?? []) {
        const { container, unmount } = render(createElement(Player, { slide }));
        for (const blank of container.querySelectorAll<HTMLElement>('button.answer-slot')) {
          expect(chromiumName(blank), id).toMatch(/, empty$/);
        }
        unmount();
      }
    }
  });
}, 120_000);
