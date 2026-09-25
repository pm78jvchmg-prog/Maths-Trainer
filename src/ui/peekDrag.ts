/**
 * Dragging right on a slide to peek at the one before it.
 *
 * The previous slide slides in from the left under the finger while the
 * current one is pushed right, stays wherever the finger stops, and springs
 * back when it lifts. It is a look, not a step: nothing is dispatched, the
 * peeked slide is inert, and the session never learns it happened. Only the
 * guided phase offers it, for the same reason the back control is absent from
 * the skill check.
 *
 * A peek starts only from a drag that is plainly sideways and rightwards, and
 * only when it begins outside anything that already owns a drag: a form
 * control (the slider), a filled blank (`data-slot`, which `slotDrag` picks
 * up), anything marked `data-no-peek`, and any box that scrolls sideways (a
 * long formula), which keeps its own swipe. The worked solution's pages sit in
 * the footer, outside the stage altogether. A drag that starts vertical is
 * left to the page's scroll; `touch-action: pan-y` on the stage is what hands
 * the sideways ones to us.
 *
 * Movement is written straight to `transform` on the two panes, never through
 * React state, so a drag costs no render and no layout.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

/** How far a finger moves before a press is read as a drag one way or the other. */
export const PEEK_THRESHOLD = 10;

/** How long the spring back takes; matches `.peek-settle` in the stylesheet. */
export const PEEK_SETTLE_MS = 260;

/**
 * What a press that has moved by (dx, dy) is. `wait` until it has moved far
 * enough to tell; `peek` for a rightward drag at least twice as sideways as it
 * is vertical; `ignore` for anything else, which is then left alone for the
 * rest of the press so a scroll never turns into a peek halfway through.
 */
export function peekIntent(dx: number, dy: number): 'wait' | 'peek' | 'ignore' {
  if (Math.hypot(dx, dy) < PEEK_THRESHOLD) return 'wait';
  return dx > 0 && dx >= 2 * Math.abs(dy) ? 'peek' : 'ignore';
}

/** How far the panes sit to the right: the drag, held between nothing and a whole slide. */
export function peekOffset(dx: number, width: number): number {
  return Math.min(Math.max(dx, 0), width);
}

/** Whether a press on `target` belongs to something inside `stage` that drags or scrolls sideways itself. */
export function ownsDrag(target: Element | null, stage: Element): boolean {
  for (let el = target; el && el !== stage; el = el.parentElement) {
    if (el.matches('input, textarea, select, [data-slot], [data-no-peek]')) return true;
    if (el.scrollWidth > el.clientWidth + 1) {
      const overflow = getComputedStyle(el).overflowX;
      if (overflow === 'auto' || overflow === 'scroll') return true;
    }
  }
  return false;
}

interface Live {
  x: number;
  y: number;
  active: boolean;
  offset: number;
  width: number;
}

/**
 * Drives a peek. `enabled` is false whenever there is nothing to peek at (the
 * first slide, the skill check). The stage gets the handler; the current slide
 * and the previous one get the refs; the previous one is rendered only while
 * `peeking`.
 */
export function usePeekDrag(enabled: boolean) {
  const stage = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLElement>(null);
  const previous = useRef<HTMLDivElement>(null);
  const live = useRef<Live | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [peeking, setPeeking] = useState(false);
  // The listeners of the press under way, which belong to the render it began in.
  const detachLive = useRef<(() => void) | undefined>(undefined);

  const place = (offset: number, width: number) => {
    if (current.current) current.current.style.transform = `translate3d(${offset}px, 0, 0)`;
    if (previous.current) previous.current.style.transform = `translate3d(${offset - width}px, 0, 0)`;
  };

  const detach = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', release);
    window.removeEventListener('pointercancel', release);
  };

  function move(event: PointerEvent) {
    const drag = live.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.active) {
      const intent = peekIntent(dx, dy);
      if (intent === 'wait') return;
      if (intent === 'ignore') {
        live.current = null;
        detach();
        return;
      }
      // Measured from here, so the slide does not jump by the threshold.
      drag.active = true;
      drag.x = event.clientX;
      drag.width = stage.current?.clientWidth ?? window.innerWidth;
      stage.current?.classList.add('peek-live');
      // A mouse drag may have begun selecting text before it was read as a peek.
      window.getSelection()?.removeAllRanges();
      setPeeking(true);
    }
    drag.offset = peekOffset(event.clientX - drag.x, drag.width);
    place(drag.offset, drag.width);
  }

  function release() {
    const drag = live.current;
    live.current = null;
    detach();
    if (!drag?.active) return;
    // The click that ends a peek is no tap: not an answer, not a retry.
    const swallow = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);

    const el = stage.current;
    el?.classList.remove('peek-live');
    el?.classList.add('peek-settle');
    place(0, drag.width);
    settle.current = setTimeout(() => {
      el?.classList.remove('peek-settle');
      if (current.current) current.current.style.transform = '';
      setPeeking(false);
    }, PEEK_SETTLE_MS);
  }

  // The previous slide mounts a render after the drag took hold; put it where
  // the finger already is before it is painted.
  useLayoutEffect(() => {
    const drag = live.current;
    if (peeking && drag?.active) place(drag.offset, drag.width);
  }, [peeking]);

  // A slide change or unmount mid-drag leaves no listener or timer behind.
  useEffect(
    () => () => {
      detachLive.current?.();
      clearTimeout(settle.current);
    },
    [],
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!enabled || peeking || live.current || !event.isPrimary || event.button !== 0) return;
    if (stage.current && ownsDrag(event.target as Element, stage.current)) return;
    live.current = { x: event.clientX, y: event.clientY, active: false, offset: 0, width: 0 };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    detachLive.current = detach;
  };

  return { stage, currentPane: current, previousPane: previous, peeking, onPointerDown };
}
