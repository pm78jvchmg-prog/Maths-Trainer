/**
 * A line of inline markup cut into the pieces `Inline` renders.
 *
 * Three markups: `$maths$`, `**bold**` and `*italic*`, bold tried before
 * italic so `**` is not read as an empty italic.
 *
 * A rendered formula is an atomic box to the browser, so a line could break
 * on either side of it: a price came out as "£" at the end of one line and
 * "5" at the start of the next, and a list of values as "47" with its comma
 * alone on the line below. So a maths piece carries the characters that must
 * stay with it: a currency sign or opening bracket written straight before it
 * (`before`), and punctuation or a closing bracket straight after (`after`).
 * Those characters are taken off the neighbouring text, never duplicated.
 *
 * Only a short formula is held that way (`GLUE_UP_TO`): the whole piece is set
 * without a break, and a long formula needs the breaks inside it more than its
 * comma needs company.
 */
export type InlinePart =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'maths'; tex: string; before: string; after: string };

const LEAD = /[£€(["']+$/;
const TRAIL = /^[,.;:!?)\]%"']+/;

/** Longest formula, in TeX characters, held on a line with its neighbours. */
export const GLUE_UP_TO = 24;

export function inlineParts(text: string): InlinePart[] {
  const raw = text.split(/(\$[^$]+\$|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  const parts: InlinePart[] = raw.map((part) => {
    if (part.startsWith('$') && part.endsWith('$') && part.length > 1) {
      return { kind: 'maths', tex: part.slice(1, -1), before: '', after: '' };
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 3) {
      return { kind: 'bold', text: part.slice(2, -2) };
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 1) {
      return { kind: 'italic', text: part.slice(1, -1) };
    }
    return { kind: 'text', text: part };
  });
  parts.forEach((part, idx) => {
    if (part.kind !== 'maths' || part.tex.length > GLUE_UP_TO) return;
    const prev = parts[idx - 1];
    if (prev?.kind === 'text') {
      const lead = LEAD.exec(prev.text)?.[0] ?? '';
      part.before = lead;
      prev.text = prev.text.slice(0, prev.text.length - lead.length);
    }
    const next = parts[idx + 1];
    if (next?.kind === 'text') {
      const trail = TRAIL.exec(next.text)?.[0] ?? '';
      part.after = trail;
      next.text = next.text.slice(trail.length);
    }
  });
  return parts.filter((part) => part.kind !== 'text' || part.text !== '');
}
