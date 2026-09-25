/**
 * A top bar that slides away while the page scrolls down and comes back the
 * moment it scrolls up, the way Safari's toolbar does. The owner asked for it
 * so a long list or a long slide gets the room the bar was taking.
 *
 * `nextHidden` is the whole decision and is pure; the hook only feeds it
 * scroll positions.
 */
import { useCallback, useRef, useState } from 'react';
import type { UIEvent } from 'react';

/** Movement smaller than this is jitter, not a direction. */
export const HIDE_THRESHOLD = 8;

export interface ScrollReading {
  /** Where the page was at the last reading that decided something. */
  from: number;
  /** Where it is now. */
  y: number;
  /** The furthest it can scroll, so a rubber-band bounce past the end is not read as scrolling up. */
  max: number;
  /** How far down the bar is always shown: near the top there is nothing to make room for. */
  reveal: number;
}

/**
 * Whether the bar should now be hidden, or `null` when the movement is too
 * small to say, in which case the caller keeps both its state and `from`.
 */
export function nextHidden({ from, y, max, reveal }: ScrollReading): boolean | null {
  const at = Math.min(Math.max(y, 0), Math.max(max, 0));
  if (at <= reveal) return false;
  const moved = at - Math.min(Math.max(from, 0), Math.max(max, 0));
  if (Math.abs(moved) < HIDE_THRESHOLD) return null;
  return moved > 0;
}

/**
 * Hide-on-scroll state for one scrolling element. Wire `onScroll` to it;
 * `show()` brings the bar back without waiting for a scroll, for a new slide.
 *
 * The first scroll event only takes a reading. That is the one a restored
 * scroll position fires, and coming back to a page should find its bar there.
 */
export function useHidingBar(reveal = 48) {
  const [hidden, setHidden] = useState(false);
  const from = useRef<number | null>(null);

  const onScroll = useCallback(
    (event: UIEvent<HTMLElement>) => {
      const el = event.currentTarget;
      const y = el.scrollTop;
      if (from.current === null) {
        from.current = y;
        return;
      }
      const next = nextHidden({ from: from.current, y, max: el.scrollHeight - el.clientHeight, reveal });
      if (next === null) return;
      from.current = y;
      setHidden(next);
    },
    [reveal],
  );

  const show = useCallback(() => {
    from.current = null;
    setHidden(false);
  }, []);

  return { hidden, onScroll, show };
}
