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
