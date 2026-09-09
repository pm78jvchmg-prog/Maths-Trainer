/**
 * Drawing the complex plane.
 *
 * Generates inline SVG rather than pulling in a chart library: the diagrams are
 * a grid, two axes and a dot, and a charting dependency would cost more than
 * the whole rest of the bundle. Colours come from the CSS custom properties so
 * the diagrams follow the app's theme.
 */

export interface PlanePoint {
  re: number;
  im: number;
  /** Drawn in the accent colour rather than plain. */
  highlight?: boolean;
}

const SIZE = 260;

/**
 * Breathing room outside the grid. Without it a point plotted at the extreme of
 * the range sits exactly on the viewBox edge and is drawn half-clipped, and the
 * outermost axis labels are cut off entirely.
 */
const MARGIN = 20;

const EXTENT = SIZE + MARGIN * 2;

/**
 * The drawing frame, owned here and exported whole.
 *
 * The tap-target overlay in the plot widget must sit exactly on top of the
 * drawn grid. Exporting the size and margin separately would leave the caller
 * to reassemble this string and keep it in step by hand; exporting the frame
 * itself makes the alignment structural.
 */
export const PLANE_VIEWBOX = `${-MARGIN} ${-MARGIN} ${EXTENT} ${EXTENT}`;

/** Maps a complex coordinate to SVG user space. Im is up, so its axis inverts. */
export function projectToPlane(value: number, range: number): number {
  return ((value + range) / (2 * range)) * SIZE;
}

/** How often to draw and label a gridline, so a wide range stays readable. */
function tickInterval(range: number): number {
  return range > 5 ? Math.ceil(range / 5) : 1;
}

const gridCache = new Map<number, string>();

/**
 * Grid and axes for a given range.
 *
 * Cached because it depends only on `range`: moving a plotted point must not
 * make the browser re-parse thirty-odd unchanged elements.
 */
function grid(range: number): string {
  const cached = gridCache.get(range);
  if (cached !== undefined) return cached;

  const step = tickInterval(range);
  const lines: string[] = [];
  const axis = projectToPlane(0, range);

  for (let n = -range; n <= range; n++) {
    // Past a small range only ticked lines are drawn: at range 25 a line per
    // unit sits 5px apart and reads as a solid block.
    if (n !== 0 && n % step !== 0) continue;
    const at = projectToPlane(n, range);
    const major = n === 0;
    lines.push(
      `<line x1="${at}" y1="0" x2="${at}" y2="${SIZE}" stroke="${major ? 'var(--text-dim)' : 'var(--border)'}" stroke-width="${major ? 1.5 : 0.6}"/>`,
      `<line x1="0" y1="${at}" x2="${SIZE}" y2="${at}" stroke="${major ? 'var(--text-dim)' : 'var(--border)'}" stroke-width="${major ? 1.5 : 0.6}"/>`,
    );
    if (major) continue;
    lines.push(
      `<text x="${at}" y="${axis + 13}" fill="var(--text-dim)" font-size="9" text-anchor="middle">${n}</text>`,
      `<text x="${axis - 6}" y="${SIZE - at + 3}" fill="var(--text-dim)" font-size="9" text-anchor="end">${n}i</text>`,
    );
  }

  const svg = lines.join('');
  gridCache.set(range, svg);
  return svg;
}

/** Where a lattice point sits in SVG user space. */
export function pointPosition(
  point: { re: number; im: number },
  range: number,
): { x: number; y: number } {
  return {
    x: projectToPlane(point.re, range),
    y: SIZE - projectToPlane(point.im, range),
  };
}

export function complexPlaneSvg(range: number, points: PlanePoint[] = []): string {
  const dots = points
    .map((point) => {
      const { x, y } = pointPosition(point, range);
      const colour = point.highlight ? 'var(--accent)' : 'var(--text)';
      return `<circle cx="${x}" cy="${y}" r="5" fill="${colour}"/>`;
    })
    .join('');
  return `<svg viewBox="${PLANE_VIEWBOX}" width="100%" style="max-width:${EXTENT}px" role="img" aria-label="Complex plane">${grid(range)}${dots}</svg>`;
}

/** The grid alone, for callers that draw their own points as live elements. */
export function planeGridSvg(range: number): string {
  return `<svg viewBox="${PLANE_VIEWBOX}" width="100%" style="max-width:${EXTENT}px" role="img" aria-label="Complex plane">${grid(range)}</svg>`;
}

const latticeCache = new Map<number, { re: number; im: number }[]>();

/** Every lattice point on a grid of the given range. Cached: it never varies. */
export function latticePoints(range: number): { re: number; im: number }[] {
  const cached = latticeCache.get(range);
  if (cached !== undefined) return cached;

  const out: { re: number; im: number }[] = [];
  for (let re = -range; re <= range; re++) {
    for (let im = -range; im <= range; im++) out.push({ re, im });
  }
  latticeCache.set(range, out);
  return out;
}

/** A grid range that comfortably contains the given coordinates. */
export function rangeFor(...values: number[]): number {
  return Math.max(5, Math.ceil(Math.max(...values.map(Math.abs)) / 5) * 5);
}
