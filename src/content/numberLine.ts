/**
 * Solution sets on a number line: the model behind the `numberLine` slide.
 *
 * Two representations meet here, and keeping them apart is the point.
 *
 * - A **set** is what gets graded: a list of pieces, each an interval with its
 *   own open or closed ends, written `(-inf,2]|[5,inf)`. Canonicalising sorts
 *   the pieces and merges any that overlap or touch at an included point, so
 *   two drawings of the same set compare equal however they were built.
 * - A **draft** is what the learner has drawn: the dots placed on the line and
 *   which gaps between them are shaded. It is held as one string, the way the
 *   `reduce` slide holds its moves, so the session's `Answer` union does not
 *   grow a member for one widget.
 *
 * A draft is written `<dots>/<shaded>`: dots as `<value><c|o>` (closed or
 * open) and shaded gaps as `<lo>:<hi>`, each list comma-separated, with `-inf`
 * and `inf` for a gap running off the edge. `-1c,2o/-1:2` is a filled dot at
 * -1, a hollow one at 2, and the stretch between them shaded, which is the set
 * `[-1,2)`. The empty string is the untouched line.
 *
 * Nothing here knows about pixels. The widget in `src/ui/numberLineSlide.tsx`
 * maps taps onto the three operations at the bottom of this file, and the
 * reducer grades with `draftMatches`, so the rule for what a drawing means is
 * written once.
 */

/** One interval of a set. Infinite ends are always open. */
export interface Piece {
  lo: number;
  hi: number;
  loClosed: boolean;
  hiClosed: boolean;
}

/** A dot on the line, filled when the point itself is in the set. */
export interface Dot {
  at: number;
  closed: boolean;
}

/** A shaded stretch between two neighbouring dots, or a dot and an edge. */
export interface Gap {
  lo: number;
  hi: number;
}

export interface Draft {
  /** Sorted by position, at most one per point. */
  dots: Dot[];
  shaded: Gap[];
}

export const EMPTY_DRAFT: Draft = { dots: [], shaded: [] };

/* ---------- Writing numbers ---------- */

/**
 * A bound as the canonical form writes it. `String` is exact for the whole
 * numbers and halves these questions use, and writes negative zero as `0`.
 */
function bound(value: number): string {
  if (value === Infinity) return 'inf';
  if (value === -Infinity) return '-inf';
  return String(value);
}

function readBound(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed === 'inf' || trimmed === '+inf') return Infinity;
  if (trimmed === '-inf') return -Infinity;
  if (trimmed === '') return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

/* ---------- Sets ---------- */

/** Reads `(-inf,2]|[5,inf)`. Undefined when any piece is malformed. */
export function parseSet(text: string): Piece[] | undefined {
  if (text.trim() === '') return [];
  const pieces: Piece[] = [];
  for (const part of text.split('|')) {
    const match = /^\s*([[(])([^,]+),([^,\])]+)([\])])\s*$/.exec(part);
    if (!match) return undefined;
    const lo = readBound(match[2]);
    const hi = readBound(match[3]);
    if (lo === undefined || hi === undefined) return undefined;
    pieces.push({
      lo,
      hi,
      loClosed: match[1] === '[' && Number.isFinite(lo),
      hiClosed: match[4] === ']' && Number.isFinite(hi),
    });
  }
  return pieces;
}

export function formatSet(pieces: Piece[]): string {
  return pieces
    .map((p) => `${p.loClosed ? '[' : '('}${bound(p.lo)},${bound(p.hi)}${p.hiClosed ? ']' : ')'}`)
    .join('|');
}

/**
 * Sorted, merged and with empty pieces dropped.
 *
 * Two pieces merge when they overlap, or when they meet at a point one of them
 * includes: `(1,3]` and `(3,5)` are one piece `(1,5)`, but `(1,3)` and `(3,5)`
 * stay two, since 3 is in neither. That second case is a real answer (a set
 * with one point taken out), so merging on touch alone would be wrong.
 */
export function canonicalPieces(pieces: Piece[]): Piece[] {
  const live = pieces
    .filter((p) => p.lo < p.hi || (p.lo === p.hi && p.loClosed && p.hiClosed))
    .map((p) => ({ ...p }))
    // Closed-left first on a tie, so a merge keeps the inclusive end.
    .sort((a, b) => a.lo - b.lo || Number(b.loClosed) - Number(a.loClosed));

  const out: Piece[] = [];
  for (const piece of live) {
    const last = out[out.length - 1];
    const joins =
      last !== undefined &&
      (last.hi > piece.lo || (last.hi === piece.lo && (last.hiClosed || piece.loClosed)));
    if (!joins) {
      out.push(piece);
      continue;
    }
    if (piece.lo === last.lo) last.loClosed = last.loClosed || piece.loClosed;
    if (piece.hi > last.hi) {
      last.hi = piece.hi;
      last.hiClosed = piece.hiClosed;
    } else if (piece.hi === last.hi) {
      last.hiClosed = last.hiClosed || piece.hiClosed;
    }
  }
  return out;
}

/** The canonical writing of a set, or undefined if it does not parse. */
export function canonicalSet(text: string): string | undefined {
  const pieces = parseSet(text);
  return pieces === undefined ? undefined : formatSet(canonicalPieces(pieces));
}

/* ---------- Drafts ---------- */

export function parseDraft(text: string): Draft | undefined {
  if (text.trim() === '') return EMPTY_DRAFT;
  const slash = text.indexOf('/');
  if (slash === -1) return undefined;
  const dotText = text.slice(0, slash).trim();
  const gapText = text.slice(slash + 1).trim();

  const dots: Dot[] = [];
  if (dotText !== '') {
    for (const token of dotText.split(',')) {
      const match = /^\s*(.+?)([co])\s*$/.exec(token);
      if (!match) return undefined;
      const at = readBound(match[1]);
      if (at === undefined || !Number.isFinite(at)) return undefined;
      if (dots.some((d) => d.at === at)) return undefined;
      dots.push({ at, closed: match[2] === 'c' });
    }
  }

  const shaded: Gap[] = [];
  if (gapText !== '') {
    for (const token of gapText.split(',')) {
      const [loText, hiText, extra] = token.split(':');
      if (hiText === undefined || extra !== undefined) return undefined;
      const lo = readBound(loText);
      const hi = readBound(hiText);
      if (lo === undefined || hi === undefined || !(lo < hi)) return undefined;
      shaded.push({ lo, hi });
    }
  }

  dots.sort((a, b) => a.at - b.at);
  return { dots, shaded };
}

export function formatDraft(draft: Draft): string {
  if (draft.dots.length === 0 && draft.shaded.length === 0) return '';
  const dots = draft.dots.map((d) => `${bound(d.at)}${d.closed ? 'c' : 'o'}`).join(',');
  const shaded = draft.shaded.map((g) => `${bound(g.lo)}:${bound(g.hi)}`).join(',');
  return `${dots}/${shaded}`;
}

/**
 * The set a drawing shows.
 *
 * A shaded gap contributes its stretch, with each end included exactly when
 * the dot there is filled. A filled dot is in the set whether or not anything
 * beside it is shaded — an isolated filled dot is a point the learner has said
 * belongs — and merging folds the ones that sit on a shaded end back into it.
 * A hollow dot on its own contributes nothing.
 */
export function draftSet(draft: Draft): Piece[] {
  const closedAt = (value: number) => draft.dots.some((d) => d.at === value && d.closed);
  const pieces: Piece[] = draft.shaded.map((g) => ({
    lo: g.lo,
    hi: g.hi,
    loClosed: Number.isFinite(g.lo) && closedAt(g.lo),
    hiClosed: Number.isFinite(g.hi) && closedAt(g.hi),
  }));
  for (const dot of draft.dots) {
    if (dot.closed) pieces.push({ lo: dot.at, hi: dot.at, loClosed: true, hiClosed: true });
  }
  return canonicalPieces(pieces);
}

/** Whether anything is shaded yet — the widget's bar for enabling Check. */
export function draftHasShading(text: string): boolean {
  const draft = parseDraft(text);
  return draft !== undefined && draft.shaded.length > 0;
}

/**
 * The grade: the drawn set against the expected one, both canonical.
 *
 * A drawing with nothing shaded never matches, even where its filled dots
 * alone happen to spell the answer, so an untouched or half-started line
 * cannot score.
 */
export function draftMatches(text: string, answer: string): boolean {
  const draft = parseDraft(text);
  if (draft === undefined || draft.shaded.length === 0) return false;
  const expected = canonicalSet(answer);
  return expected !== undefined && formatSet(draftSet(draft)) === expected;
}

/* ---------- What a tap does ---------- */

/** The gap a position falls in, bounded by the nearest dots either side. */
export function gapAround(draft: Draft, value: number): Gap | undefined {
  if (draft.dots.some((d) => d.at === value)) return undefined;
  let lo = -Infinity;
  let hi = Infinity;
  for (const dot of draft.dots) {
    if (dot.at < value && dot.at > lo) lo = dot.at;
    if (dot.at > value && dot.at < hi) hi = dot.at;
  }
  return { lo, hi };
}

const sameGap = (a: Gap, b: Gap) => a.lo === b.lo && a.hi === b.hi;

/**
 * Tapping a number: place a dot there, or take away the one already there.
 *
 * A new dot is filled. Dropped inside a shaded stretch it splits the stretch
 * and both halves stay shaded, so marking a point inside an interval does not
 * undo the shading around it. Taking a dot away joins the gaps either side,
 * shaded only if both were: the reverse of the split, and the reading that
 * never shades something the learner did not.
 */
export function togglePoint(draft: Draft, at: number): Draft {
  const existing = draft.dots.find((d) => d.at === at);
  if (existing) {
    const dots = draft.dots.filter((d) => d !== existing);
    const left = draft.shaded.find((g) => g.hi === at);
    const right = draft.shaded.find((g) => g.lo === at);
    const shaded = draft.shaded.filter((g) => g !== left && g !== right);
    if (left && right) shaded.push({ lo: left.lo, hi: right.hi });
    return { dots, shaded };
  }

  const around = gapAround(draft, at)!;
  const dots = [...draft.dots, { at, closed: true }].sort((a, b) => a.at - b.at);
  const wasShaded = draft.shaded.some((g) => sameGap(g, around));
  const shaded = draft.shaded.filter((g) => !sameGap(g, around));
  if (wasShaded) shaded.push({ lo: around.lo, hi: at }, { lo: at, hi: around.hi });
  return { dots, shaded };
}

/** Tapping a dot: filled becomes hollow and hollow becomes filled. */
export function toggleClosed(draft: Draft, at: number): Draft {
  return {
    dots: draft.dots.map((d) => (d.at === at ? { ...d, closed: !d.closed } : d)),
    shaded: draft.shaded,
  };
}

/**
 * Tapping the line: shade the stretch the tap fell in, or clear it if shaded.
 *
 * Beyond the outermost dot the stretch runs off the edge, which is how a ray
 * is drawn. With no dots at all it is the whole line.
 */
export function toggleGap(draft: Draft, value: number): Draft {
  const gap = gapAround(draft, value);
  if (!gap) return draft;
  const shaded = draft.shaded.some((g) => sameGap(g, gap))
    ? draft.shaded.filter((g) => !sameGap(g, gap))
    : [...draft.shaded, gap];
  return { dots: draft.dots, shaded };
}
