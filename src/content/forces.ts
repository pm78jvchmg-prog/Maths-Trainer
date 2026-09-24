/**
 * The force-diagram model: where a body sits, which way each arrow points, and
 * what a tapped set of arrows comes to.
 *
 * A `forces` slide shows a box on a level floor, on a slope, or hanging from a
 * string, with arrows drawn from its centre. The learner either picks the
 * arrows that act (`pick`) or fills in the magnitudes of arrows that are all
 * acting (`fill`). This file owns the geometry and the grade for `pick`; the
 * widget in `src/ui/forcesSlide.tsx` only maps taps onto it and draws.
 *
 * **Directions are the arrow ids.** No two arrows on one diagram point the same
 * way, so a direction names an arrow uniquely, and a `pick` answer is the set
 * of directions that act. The draft is one string, the chosen ids sorted and
 * joined by `|` (`down|outOfSlope|upSlope`), so `Answer` did not grow.
 *
 * Two rings of arrow heads keep every head a thumb apart. Arrows square to the
 * page (up, down, left, right) reach `WORLD_REACH` from the centre; arrows
 * square to a slope reach `SLOPE_REACH`. A slope arrow and a page arrow can be
 * as little as the slope's angle apart, and at 25 degrees two heads on one
 * ring would sit closer than a fingertip; on different rings they do not.
 * `headsClash` is the check, and the generator tests run it on every draw.
 */

/** Where the body is. A slope's angle is in degrees; it rises to one side. */
export type ForceScene =
  | { surface: 'level' }
  | { surface: 'slope'; angle: number; rises: 'left' | 'right' }
  | { surface: 'hanging' };

/** The page's four directions, then the slope's four. */
export const DIRECTIONS = [
  'up',
  'down',
  'left',
  'right',
  'upSlope',
  'downSlope',
  'outOfSlope',
  'intoSlope',
] as const;

export type Direction = (typeof DIRECTIONS)[number];

const SLOPE_DIRECTIONS: readonly Direction[] = ['upSlope', 'downSlope', 'outOfSlope', 'intoSlope'];

export const isSlopeDirection = (dir: Direction) => SLOPE_DIRECTIONS.includes(dir);

/** Which way an arrow points, in words, for a screen reader. */
export const DIRECTION_WORDS: Record<Direction, string> = {
  up: 'straight up',
  down: 'straight down',
  left: 'to the left',
  right: 'to the right',
  upSlope: 'up the slope',
  downSlope: 'down the slope',
  outOfSlope: 'out of the slope, at right angles to it',
  intoSlope: 'into the slope, at right angles to it',
};

/** One arrow on the diagram. Its direction is its id. */
export interface ForceArrow {
  id: Direction;
  /** What the arrow is called on the diagram, TeX: `W`, `R`, `20\text{ N}`. */
  label: string;
  /**
   * `fill` only: the magnitude, TeX without its unit (`20`), shown beside the
   * label. An arrow with no `given` is a blank the learner fills from the bank.
   */
  given?: string;
}

/* ---------- The draft and the grade (`pick`) ---------- */

/** The ids in a draft, as a sorted list with no repeats and nothing empty. */
function idsOf(draft: string): string[] {
  return [...new Set(draft.split('|').filter((id) => id !== ''))].sort();
}

/**
 * A set of arrows written the one way: ids sorted and joined by `|`. The empty
 * set is the empty string.
 */
export const canonicalForces = (draft: string): string => idsOf(draft).join('|');

/** Tap an arrow: on if it was off, off if it was on. */
export function toggleForce(draft: string, id: Direction): string {
  const ids = idsOf(draft);
  return (ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id]).sort().join('|');
}

/** Whether a draft names this arrow. */
export const forceChosen = (draft: string, id: Direction): boolean => idsOf(draft).includes(id);

/**
 * The drawn set against the expected one, both sorted first, so the order the
 * arrows were tapped in cannot matter. Nothing chosen never matches.
 */
export function forcesMatch(draft: string, expected: string): boolean {
  const mine = canonicalForces(draft);
  return mine !== '' && mine === canonicalForces(expected);
}

/* ---------- Geometry ---------- */

/** The drawing's coordinate space, 280 wide like `plotSvg`. */
export const FIG_W = 280;
export const FIG_H = 252;
/** The body's centre, which every arrow starts from. */
export const CX = 140;
export const CY = 124;
/** Half the box's side. */
export const HALF = 22;
export const WORLD_REACH = 92;
export const SLOPE_REACH = 56;
/** Radius of an arrow head's tap target: 44 across, before the SVG scales up. */
export const HIT_R = 22;
/** How far past the head a label sits. */
const LABEL_GAP = 17;

export interface Point {
  x: number;
  y: number;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * An arrow's heading in degrees, anticlockwise from the positive x-axis with y
 * up, as a mathematician draws it. Slope directions turn with the slope.
 */
export function heading(scene: ForceScene, dir: Direction): number {
  const along = scene.surface !== 'slope' ? 0 : scene.rises === 'right' ? scene.angle : 180 - scene.angle;
  // The outward normal is a quarter turn from up the slope, away from it.
  const out = scene.surface !== 'slope' ? 90 : scene.rises === 'right' ? along + 90 : along - 90;
  switch (dir) {
    case 'up':
      return 90;
    case 'down':
      return 270;
    case 'left':
      return 180;
    case 'right':
      return 0;
    case 'upSlope':
      return along;
    case 'downSlope':
      return along + 180;
    case 'outOfSlope':
      return out;
    case 'intoSlope':
      return out + 180;
  }
}

/** A unit vector on the page (y down) for a heading. */
function unit(deg: number): Point {
  return { x: Math.cos(rad(deg)), y: -Math.sin(rad(deg)) };
}

export interface ArrowLayout {
  id: Direction;
  head: Point;
  /** The three corners of the arrowhead, as an SVG `points` list. */
  tip: string;
  /** Where the label's centre sits. */
  labelAt: Point;
}

const round = (value: number) => Math.round(value * 10) / 10;

/** Where an arrow's head, tip and label go. */
export function arrowLayout(scene: ForceScene, dir: Direction): ArrowLayout {
  const u = unit(heading(scene, dir));
  const reach = isSlopeDirection(dir) ? SLOPE_REACH : WORLD_REACH;
  const head = { x: CX + reach * u.x, y: CY + reach * u.y };
  // The arrowhead: 11 back along the shaft, 6 either side of it.
  const back = { x: head.x - 11 * u.x, y: head.y - 11 * u.y };
  const side = { x: -u.y * 6, y: u.x * 6 };
  const tip = [head, { x: back.x + side.x, y: back.y + side.y }, { x: back.x - side.x, y: back.y - side.y }]
    .map((p) => `${round(p.x)},${round(p.y)}`)
    .join(' ');
  // A hanging body's tension runs up its own string, so its label goes beside
  // the head rather than on top of the string.
  const labelAt =
    scene.surface === 'hanging' && dir === 'up'
      ? { x: head.x + LABEL_GAP, y: head.y + 4 }
      : { x: head.x + LABEL_GAP * u.x, y: head.y + LABEL_GAP * u.y };
  return { id: dir, head: { x: round(head.x), y: round(head.y) }, tip, labelAt: { x: round(labelAt.x), y: round(labelAt.y) } };
}

/**
 * Pairs of arrows whose tap targets overlap, or any head whose target runs off
 * the picture. Empty when every head is its own thumb-sized target.
 */
export function headsClash(scene: ForceScene, dirs: readonly Direction[]): string[] {
  const heads = dirs.map((dir) => arrowLayout(scene, dir));
  const clashes: string[] = [];
  for (const [idx, a] of heads.entries()) {
    if (a.head.x - HIT_R < 0 || a.head.x + HIT_R > FIG_W || a.head.y - HIT_R < 0 || a.head.y + HIT_R > FIG_H) {
      clashes.push(`${a.id} runs off the picture`);
    }
    for (const b of heads.slice(idx + 1)) {
      if (Math.hypot(a.head.x - b.head.x, a.head.y - b.head.y) < 2 * HIT_R) {
        clashes.push(`${a.id} and ${b.id}`);
      }
    }
  }
  return clashes;
}

/** How an arrow is drawn: faint and dashed until chosen, or plainly there. */
export type ArrowLook = 'faint' | 'solid' | 'chosen';

export interface DiagramOptions {
  /** Per arrow; an arrow left out is `solid`. */
  looks?: Partial<Record<Direction, ArrowLook>>;
  /** Draw a tap target over every head, carrying `data-arrow`. */
  interactive?: boolean;
  label?: string;
}

const pts = (points: Point[]) => points.map((p) => `${round(p.x)},${round(p.y)}`).join(' ');

/**
 * The surface, the body and whatever holds it, as SVG markup.
 *
 * A slope is drawn at its stated angle: its line runs through the box's base
 * across the whole picture, shaded beneath, with a horizontal reference and an
 * arc near its lower end marking the angle.
 */
function sceneMarkup(scene: ForceScene): string[] {
  const parts: string[] = [];
  const ink = 'stroke="currentColor" stroke-width="2"';

  if (scene.surface === 'hanging') {
    parts.push(`<line x1="70" y1="4" x2="210" y2="4" ${ink} />`);
    for (let x = 76; x <= 206; x += 10) {
      parts.push(`<line x1="${x}" y1="4" x2="${x - 6}" y2="0" stroke="currentColor" stroke-width="1" opacity="0.5" />`);
    }
    parts.push(`<line x1="${CX}" y1="4" x2="${CX}" y2="${CY - HALF}" stroke="currentColor" stroke-width="1.5" opacity="0.7" />`);
    parts.push(boxMarkup(0));
    return parts;
  }

  if (scene.surface === 'level') {
    const floor = CY + HALF;
    parts.push(`<rect x="0" y="${floor}" width="${FIG_W}" height="${FIG_H - floor}" fill="currentColor" opacity="0.07" />`);
    parts.push(`<line x1="0" y1="${floor}" x2="${FIG_W}" y2="${floor}" ${ink} />`);
    parts.push(boxMarkup(0));
    return parts;
  }

  // The slope line, through the middle of the box's base.
  const tilt = scene.rises === 'right' ? scene.angle : -scene.angle;
  const into = unit(heading(scene, 'intoSlope'));
  const base = { x: CX + HALF * into.x, y: CY + HALF * into.y };
  const slopeY = (x: number) => base.y - (x - base.x) * Math.tan(rad(tilt));
  parts.push(
    `<polygon points="${pts([
      { x: 0, y: slopeY(0) },
      { x: FIG_W, y: slopeY(FIG_W) },
      { x: FIG_W, y: FIG_H },
      { x: 0, y: FIG_H },
    ])}" fill="currentColor" opacity="0.07" />`,
  );
  parts.push(`<line x1="0" y1="${round(slopeY(0))}" x2="${FIG_W}" y2="${round(slopeY(FIG_W))}" ${ink} />`);

  // The angle, marked near the low end: a dashed horizontal and an arc.
  const lowX = scene.rises === 'right' ? 26 : FIG_W - 26;
  const low = { x: lowX, y: slopeY(lowX) };
  const way = scene.rises === 'right' ? 1 : -1;
  const arcR = 38;
  const arcEnd = { x: low.x + way * arcR * Math.cos(rad(scene.angle)), y: low.y - arcR * Math.sin(rad(scene.angle)) };
  parts.push(
    `<line x1="${round(low.x)}" y1="${round(low.y)}" x2="${round(low.x + way * 70)}" y2="${round(low.y)}" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.6" />`,
  );
  parts.push(
    `<path d="M ${round(low.x + way * arcR)} ${round(low.y)} A ${arcR} ${arcR} 0 0 ${scene.rises === 'right' ? 0 : 1} ${round(arcEnd.x)} ${round(arcEnd.y)}" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.7" />`,
  );
  parts.push(boxMarkup(tilt));
  return parts;
}

/** The box, turned to sit flat on a slope of `tilt` degrees (anticlockwise). */
function boxMarkup(tilt: number): string {
  const c = Math.cos(rad(tilt));
  const s = Math.sin(rad(tilt));
  // Corners in the box's own frame (x along, y up), turned, then flipped to page y.
  const corners = [
    [-HALF, -HALF],
    [HALF, -HALF],
    [HALF, HALF],
    [-HALF, HALF],
  ].map(([x, y]) => ({ x: CX + x * c - y * s, y: CY - (x * s + y * c) }));
  return `<polygon points="${pts(corners)}" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />`;
}

/** Where the slope's angle label goes: just beyond the middle of its arc. */
export function angleLabelAt(scene: ForceScene): Point | undefined {
  if (scene.surface !== 'slope') return undefined;
  const tilt = scene.rises === 'right' ? scene.angle : -scene.angle;
  const into = unit(heading(scene, 'intoSlope'));
  const base = { x: CX + HALF * into.x, y: CY + HALF * into.y };
  const lowX = scene.rises === 'right' ? 26 : FIG_W - 26;
  const lowY = base.y - (lowX - base.x) * Math.tan(rad(tilt));
  const way = scene.rises === 'right' ? 1 : -1;
  const half = rad(scene.angle / 2);
  return { x: round(lowX + way * 54 * Math.cos(half)), y: round(lowY - 54 * Math.sin(half)) };
}

/** A few words saying what the picture shows, for a screen reader. */
export function sceneWords(scene: ForceScene): string {
  if (scene.surface === 'level') return 'A box on a level floor';
  if (scene.surface === 'hanging') return 'A box hanging from a string';
  return `A box on a slope rising to the ${scene.rises} at ${scene.angle} degrees`;
}

/**
 * The whole diagram as an SVG string: scene, then arrows, then, when asked,
 * a tap target over every head.
 *
 * Every colour is `currentColor`; a chosen arrow carries `plot-accent`, so the
 * stylesheet gives it the accent and, once graded, the verdict. Labels are not
 * drawn here: they are TeX, and KaTeX does not render inside SVG text, so the
 * widget lays them over the picture at `labelAt`.
 */
export function forceDiagramSvg(scene: ForceScene, arrows: readonly ForceArrow[], options: DiagramOptions = {}): string {
  const label = options.label ?? sceneWords(scene);
  const parts = [
    `<svg viewBox="0 0 ${FIG_W} ${FIG_H}" width="100%" role="${options.interactive ? 'group' : 'img'}" aria-label="${label}">`,
    ...sceneMarkup(scene),
  ];

  for (const arrow of arrows) {
    const look = options.looks?.[arrow.id] ?? 'solid';
    const at = arrowLayout(scene, arrow.id);
    const cls = look === 'chosen' ? 'force-arrow plot-accent' : `force-arrow ${look}`;
    const dash = look === 'faint' ? ' stroke-dasharray="5 4"' : '';
    // The shaft stops short of the tip so its square end does not poke through.
    const u = unit(heading(scene, arrow.id));
    const stop = { x: at.head.x - 9 * u.x, y: at.head.y - 9 * u.y };
    parts.push(
      `<g class="${cls}"><line x1="${CX}" y1="${CY}" x2="${round(stop.x)}" y2="${round(stop.y)}" stroke="currentColor" stroke-width="3"${dash} /><polygon points="${at.tip}" fill="currentColor" /></g>`,
    );
  }

  if (options.interactive) {
    for (const arrow of arrows) {
      const at = arrowLayout(scene, arrow.id);
      const chosen = options.looks?.[arrow.id] === 'chosen';
      parts.push(
        `<circle class="force-hit" data-arrow="${arrow.id}" cx="${at.head.x}" cy="${at.head.y}" r="${HIT_R}" fill="transparent" role="button" tabindex="0" aria-pressed="${chosen}" aria-label="Arrow pointing ${DIRECTION_WORDS[arrow.id]}" />`,
      );
    }
  }

  // The centre every force acts through.
  parts.push(`<circle cx="${CX}" cy="${CY}" r="3" fill="currentColor" />`);
  parts.push('</svg>');
  return parts.join('');
}
