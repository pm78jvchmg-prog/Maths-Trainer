/**
 * Dragging a placed tile from one blank to another.
 *
 * Every bank widget lets a tile be tapped out of its blank and placed again;
 * this adds the direct route, a drag from the filled blank to the blank it
 * should be in. A drag starts only once the finger has moved a few pixels, so
 * a tap on a filled blank still empties it as before. While a drag is live the
 * tile follows the finger, the blank under it is outlined, and the click the
 * browser fires at the end is swallowed, so letting go never also counts as a
 * tap (on the blank, or on the question, which would be a retry).
 *
 * What a drop does to the answer is the caller's: `swapSlots` for blanks that
 * stand for fixed places, `moveInList` for the steps of a proof.
 */
import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

/** How far a finger moves before a press on a filled blank becomes a drag. */
const THRESHOLD = 8;

/** The values with two blanks exchanged; dropping on an empty blank moves the tile there. */
export function swapSlots(values: string[], from: number, to: number): string[] {
  const next = [...values];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/**
 * A list with one entry taken out and put back in at another position, for
 * slots that hold one unbroken run from the top: a drop past the last entry
 * puts it last.
 */
export function moveInList<T>(values: T[], from: number, to: number): T[] {
  const next = [...values];
  const [moved] = next.splice(from, 1);
  next.splice(Math.min(to, next.length), 0, moved);
  return next;
}

interface Live {
  from: number;
  x: number;
  y: number;
  el: HTMLElement;
  /** Whatever the stylesheet already transforms the tile by, such as centring it on a spot. */
  base: string;
  group: Element | null;
  active: boolean;
  over: number | null;
}

export function useSlotDrag(enabled: boolean, onDrop: (from: number, to: number) => void) {
  const live = useRef<Live | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [from, setFrom] = useState<number | null>(null);

  const slotUnder = (drag: Live, clientX: number, clientY: number): number | null => {
    const hit = document.elementFromPoint(clientX, clientY)?.closest('[data-slot]');
    if (!hit || (drag.group && hit.closest('[data-slot-group]') !== drag.group)) return null;
    const idx = Number(hit.getAttribute('data-slot'));
    return Number.isInteger(idx) ? idx : null;
  };

  const end = (drop: boolean) => {
    const drag = live.current;
    live.current = null;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    if (!drag) return;
    drag.el.style.transform = '';
    drag.el.classList.remove('dragging');
    setOver(null);
    setFrom(null);
    if (!drag.active) return;
    // The click that follows a drag belongs to no tap: swallow it wherever it lands.
    const swallow = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
    if (drop && drag.over !== null && drag.over !== drag.from) onDrop(drag.from, drag.over);
  };

  function move(event: PointerEvent) {
    const drag = live.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.active) {
      if (Math.hypot(dx, dy) < THRESHOLD) return;
      drag.active = true;
      drag.el.classList.add('dragging');
      setFrom(drag.from);
    }
    drag.el.style.transform = `translate(${dx}px, ${dy}px)${drag.base === 'none' ? '' : ` ${drag.base}`}`;
    const target = slotUnder(drag, event.clientX, event.clientY);
    if (target !== drag.over) {
      drag.over = target;
      setOver(target);
    }
  }

  function up() {
    end(true);
  }

  function cancel() {
    end(false);
  }

  /** Props for the blank at `idx`; only a filled blank can be picked up. */
  const slotProps = (idx: number, filled: boolean) => ({
    'data-slot': idx,
    'data-drop': over === idx && from !== idx ? 'true' : undefined,
    onPointerDown:
      enabled && filled
        ? (event: ReactPointerEvent<HTMLElement>) => {
            if (event.button !== 0 || live.current) return;
            // The tile moves, not whatever wraps it (a table cell, a numbered row).
            const el = ((event.target as HTMLElement).closest('.answer-slot') as HTMLElement | null) ?? event.currentTarget;
            live.current = {
              from: idx,
              x: event.clientX,
              y: event.clientY,
              el,
              base: getComputedStyle(el).transform,
              group: el.closest('[data-slot-group]'),
              active: false,
              over: null,
            };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
            window.addEventListener('pointercancel', cancel);
          }
        : undefined,
  });

  return { slotProps };
}
