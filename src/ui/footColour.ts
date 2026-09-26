/**
 * The colour at the foot of the home list, for the strip iOS paints below
 * the window.
 *
 * On the owner's installed iPhone app the window stops 59pt short of the
 * screen and iOS fills the gap with the body's background colour; nothing on
 * the page reaches it. So the home list sets the body to whatever colour its
 * bands show at the bottom edge of the window, and the strip changes with it
 * as the list scrolls, reading as more of the list rather than a band below
 * it. The page's own background is on `#root`, so the body colour touches
 * nothing but the strip.
 *
 * The stops mirror `.band-maths` and `.band-applied` in `index.css`; change
 * both together.
 */

type Rgba = [number, number, number, number];
type Stop = { at: (height: number) => number; colour: Rgba };

/** `--edge`, the page colour the bands are laid over. */
export const EDGE: Rgba = [30, 33, 84, 1];

/** How much darker the strip is than the list's foot: the end of the fade
 *  over a list's last stretch (`.app-wide::after`, `rgb(0 0 0 / 0.14)`). */
const FOOT_SHADE = 0.14;

/** The inset shade over both runs (`rgb(0 0 0 / 0.2)`). */
const SHADE = 0.2;

const BAND_STOPS: Record<string, Stop[]> = {
  maths: [
    { at: () => 0, colour: [66, 72, 214, 0.42] },
    { at: (h) => h - 320, colour: [66, 72, 214, 0.42] },
    { at: (h) => h - 150, colour: [115, 38, 180, 0.52] },
    { at: (h) => h, colour: [84, 34, 91, 1] },
  ],
  applied: [
    { at: () => 0, colour: [84, 34, 91, 1] },
    { at: () => 130, colour: [215, 80, 140, 0.4] },
    { at: () => 280, colour: [250, 130, 100, 0.33] },
    { at: () => 420, colour: [245, 135, 60, 0.3] },
    { at: (h) => 0.6 * h, colour: [240, 120, 40, 0.3] },
    { at: (h) => h, colour: [160, 60, 10, 0.5] },
  ],
};

/**
 * The gradient's colour `offset` px down a band `height` px tall, as CSS
 * draws it: a stop placed before an earlier one moves up to meet it, and
 * colours are mixed with their alpha premultiplied.
 */
function gradientAt(stops: Stop[], offset: number, height: number): Rgba {
  let last = -Infinity;
  const placed = stops.map((stop) => {
    last = Math.max(last, stop.at(height));
    return { at: last, colour: stop.colour };
  });
  if (offset <= placed[0].at) return placed[0].colour;
  for (let i = 1; i < placed.length; i++) {
    const a = placed[i - 1];
    const b = placed[i];
    if (offset > b.at) continue;
    const t = b.at === a.at ? 1 : (offset - a.at) / (b.at - a.at);
    const alpha = a.colour[3] + (b.colour[3] - a.colour[3]) * t;
    const channel = (k: number) =>
      alpha === 0
        ? 0
        : (a.colour[k] * a.colour[3] + (b.colour[k] * b.colour[3] - a.colour[k] * a.colour[3]) * t) / alpha;
    return [channel(0), channel(1), channel(2), alpha];
  }
  return placed[placed.length - 1].colour;
}

/** What a band shows `offset` px down: its gradient over the page, shaded. */
export function bandColour(band: string, offset: number, height: number, shade = 0): string {
  const stops = BAND_STOPS[band];
  const [r, g, b, a] = stops ? gradientAt(stops, offset, height) : [0, 0, 0, 0];
  const dim = stops ? (1 - SHADE) * (1 - shade) : 1 - shade;
  const over = (c: number, base: number) => (c * a + base * (1 - a)) * dim;
  return toCss([over(r, EDGE[0]), over(g, EDGE[1]), over(b, EDGE[2]), 1]);
}

function toCss([r, g, b]: Rgba): string {
  return `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`;
}

/**
 * Sets the body to the colour at the bottom edge of the window, read from
 * whichever band is there and darkened as the fade over it ends. Anything
 * else there (past the last band) leaves the page colour, darkened the same.
 */
export function paintFoot(list: HTMLElement): void {
  const foot = window.innerHeight - 1;
  let colour = bandColour('', 0, 0, FOOT_SHADE);
  for (const el of list.querySelectorAll<HTMLElement>('.band')) {
    const box = el.getBoundingClientRect();
    if (foot >= box.top && foot < box.bottom) {
      const band = [...el.classList].find((c) => c.startsWith('band-'))?.slice(5) ?? '';
      colour = bandColour(band, foot - box.top, box.height, FOOT_SHADE);
      break;
    }
  }
  document.body.style.backgroundColor = colour;
}
