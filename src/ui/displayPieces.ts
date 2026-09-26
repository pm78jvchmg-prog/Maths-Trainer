/**
 * A display's separate formulae, split at each top-level `\qquad`.
 *
 * Content writes two or three results on one display line with `\qquad`
 * between them. As one KaTeX formula that line cannot wrap, so on a phone it
 * scrolled sideways inside its panel with both ends clipped. Rendered as one
 * formula per piece, the pieces sit side by side while they fit and stack when
 * they do not; only a single formula wider than the panel still scrolls.
 *
 * Only `\qquad` is a separator: `\quad` also spaces parts of one statement
 * (`\text{Left} \quad \square \quad \text{Right}`) that must not be pulled
 * apart. Nothing inside braces, `\left...\right` or an environment is split,
 * so every piece is valid TeX on its own.
 */
export function displayPieces(tex: string): string[] {
  const pieces: string[] = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  while (i < tex.length) {
    const ch = tex[i];
    if (ch === '\\') {
      const name = /^\\([a-zA-Z]+|.)/.exec(tex.slice(i))?.[1] ?? '';
      if (name === 'begin' || name === 'left') depth += 1;
      else if (name === 'end' || name === 'right') depth -= 1;
      else if (name === 'qquad' && depth === 0) {
        pieces.push(tex.slice(start, i));
        start = i + 1 + name.length;
      }
      i += 1 + name.length;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    i += 1;
  }
  pieces.push(tex.slice(start));
  const kept = pieces.map((piece) => piece.trim()).filter((piece) => piece !== '');
  return kept.length > 0 ? kept : [tex];
}

/**
 * A display's lines: the rows of a `gathered` block that is the whole display,
 * or the display itself as one line.
 *
 * `gathered` stacks lines of working, centred, and is written that way across
 * the content. As one KaTeX formula none of its lines could break, so one
 * long line (`\rho g h = 1025 \times 9.8 \times 10 = 100\,450`) scrolled the
 * whole block sideways on a phone. Taken apart, each line is set on a row of
 * its own and can break after an `=` like any other display. An `aligned`
 * block is left whole: its lines line up on the `&`, which a split would lose.
 */
export function displayLines(tex: string): string[] {
  const whole = /^\s*\\begin\{gathered\}([\s\S]*)\\end\{gathered\}\s*$/.exec(tex);
  if (!whole) return [tex];
  const body = whole[1];
  const lines: string[] = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  while (i < body.length) {
    if (body.startsWith('\\\\', i) && depth === 0) {
      lines.push(body.slice(start, i));
      i += 2;
      // A row separator may carry extra space, `\\[4pt]`; the rows here are
      // spaced by the layout instead.
      const gap = /^\s*\[[^\]]*\]/.exec(body.slice(i));
      if (gap) i += gap[0].length;
      start = i;
      continue;
    }
    if (body[i] === '\\') {
      const name = /^\\([a-zA-Z]+|.)/.exec(body.slice(i))?.[1] ?? '';
      if (name === 'begin' || name === 'left') depth += 1;
      else if (name === 'end' || name === 'right') depth -= 1;
      if (depth < 0) return [tex];
      i += 1 + name.length;
      continue;
    }
    if (body[i] === '{') depth += 1;
    else if (body[i] === '}') depth -= 1;
    if (depth < 0) return [tex];
    i += 1;
  }
  lines.push(body.slice(start));
  // A group closed that was never opened, or one left open, means the outer
  // `\begin` and `\end` are two different blocks
  // (`\begin{gathered} a \end{gathered} + \begin{gathered} b \end{gathered}`).
  if (depth !== 0) return [tex];
  const kept = lines.map((line) => line.trim()).filter((line) => line !== '');
  return kept.length > 0 ? kept : [tex];
}

/**
 * The rows of an `aligned` block that is the whole piece, each split at its
 * `&` into the part before the alignment point and the part after; or null
 * for anything else.
 *
 * An `aligned` block cannot break, so a long line of working scrolled the
 * whole block sideways on a phone. Laid out as two columns instead, the right
 * one can wrap after an `=` or a `+` while every line still lines up on its
 * `&`. A row with two or more `&` (a second pair of columns) keeps the block
 * whole, since two columns cannot show it.
 */
export function alignedRows(tex: string): [string, string][] | null {
  const whole = /^\s*\\begin\{aligned\}([\s\S]*)\\end\{aligned\}\s*$/.exec(tex);
  if (!whole) return null;
  const body = whole[1];
  const rows: [string, string][] = [];
  let depth = 0;
  let start = 0;
  let amp = -1;
  const endRow = (at: number) => {
    const row = amp < 0 ? [body.slice(start, at), ''] : [body.slice(start, amp), body.slice(amp + 1, at)];
    rows.push([row[0].trim(), row[1].trim()]);
  };
  let i = 0;
  while (i < body.length) {
    if (body.startsWith('\\\\', i) && depth === 0) {
      endRow(i);
      i += 2;
      const gap = /^\s*\[[^\]]*\]/.exec(body.slice(i));
      if (gap) i += gap[0].length;
      start = i;
      amp = -1;
      continue;
    }
    const ch = body[i];
    if (ch === '\\') {
      const name = /^\\([a-zA-Z]+|.)/.exec(body.slice(i))?.[1] ?? '';
      if (name === 'begin' || name === 'left') depth += 1;
      else if (name === 'end' || name === 'right') depth -= 1;
      if (depth < 0) return null;
      i += 1 + name.length;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (ch === '&' && depth === 0) {
      if (amp >= 0) return null;
      amp = i;
    }
    if (depth < 0) return null;
    i += 1;
  }
  if (depth !== 0) return null;
  endRow(body.length);
  const kept = rows.filter(([left, right]) => left !== '' || right !== '');
  return kept.length > 0 ? kept : null;
}
