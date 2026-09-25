/**
 * The answer editor.
 *
 * Typing used to append to the end of a string and backspace used to remove the
 * last character, so correcting a typo in the middle meant deleting everything
 * after it and typing it all again. Fixing that needs a caret that can sit
 * *inside* the expression, and that is the whole reason this file exists rather
 * than a couple of extra keypad buttons.
 *
 * It cannot be done with one TeX string. KaTeX renders a formula as an opaque
 * block and offers no handle on a sub-expression inside it, so a caret at
 * character 7 has nowhere to be drawn; splitting the string at character 7 to
 * make somewhere gives two fragments that are usually invalid TeX. The `steps`
 * slide hit this first and answered it by holding its line as an array of
 * fragments instead of a string, and the tiles templates hit it again. This is
 * the same answer a third time: the answer is a tree of nodes, each of which
 * renders as valid TeX on its own.
 *
 * Two serialisations come out of that tree, and keeping them apart is the same
 * discipline the content follows:
 *
 * - `toTex` is what the learner reads — a real stacked fraction.
 * - `toAnswer` is what mathjs parses. It is never displayed, so it can be
 *   unambiguous rather than pretty: `(3)/(4)` for that same fraction.
 */
import { useMemo } from 'react';
import type { KeypadKey } from '../content/types';
import { Tex } from './Math';

/**
 * A node of the answer.
 *
 * An atom carries both audiences because a key's two forms differ: the
 * multiplication key reads as × and parses as *.
 */
export type Node =
  | { kind: 'atom'; tex: string; ans: string }
  | { kind: 'frac'; num: Node[]; den: Node[] }
  | { kind: 'root'; arg: Node[] }
  | { kind: 'sup'; arg: Node[] }
  /** A trig function with its argument inside, e.g. sin(30). */
  | { kind: 'fn'; name: string; unit: 'degrees' | 'radians'; arg: Node[] };

/** One step down into a node's slot, naming which slot. */
export interface Step {
  node: number;
  slot: 'num' | 'den' | 'arg';
}

/** Where the next keystroke lands: a slot, named by the chain reaching it. */
export interface Caret {
  steps: Step[];
  index: number;
}

export const EMPTY_CARET: Caret = { steps: [], index: 0 };

/* ---------- reading and rewriting a slot ---------- */

function slotOf(node: Node, slot: Step['slot']): Node[] {
  if (node.kind === 'frac') return slot === 'num' ? node.num : node.den;
  if (node.kind === 'root' || node.kind === 'sup' || node.kind === 'fn') return node.arg;
  return [];
}

function withSlot(node: Node, slot: Step['slot'], next: Node[]): Node {
  if (node.kind === 'frac') {
    return slot === 'num' ? { ...node, num: next } : { ...node, den: next };
  }
  if (node.kind === 'root' || node.kind === 'sup' || node.kind === 'fn') return { ...node, arg: next };
  return node;
}

/** The list of nodes the caret sits in. */
export function listAt(root: Node[], steps: Step[]): Node[] {
  let list = root;
  for (const step of steps) {
    const node = list[step.node];
    if (!node) return [];
    list = slotOf(node, step.slot);
  }
  return list;
}

/** A copy of the tree with one slot replaced. Immutable, so React re-renders. */
function replaceAt(root: Node[], steps: Step[], next: Node[]): Node[] {
  if (steps.length === 0) return next;
  const [head, ...rest] = steps;
  const node = root[head.node];
  if (!node) return root;
  const inner = replaceAt(slotOf(node, head.slot), rest, next);
  const copy = [...root];
  copy[head.node] = withSlot(node, head.slot, inner);
  return copy;
}

/* ---------- edits ---------- */

export interface Doc {
  nodes: Node[];
  caret: Caret;
}

export const EMPTY_DOC: Doc = { nodes: [], caret: EMPTY_CARET };

function insert(doc: Doc, node: Node, into?: Step['slot']): Doc {
  const list = listAt(doc.nodes, doc.caret.steps);
  const next = [...list.slice(0, doc.caret.index), node, ...list.slice(doc.caret.index)];
  const nodes = replaceAt(doc.nodes, doc.caret.steps, next);
  // A template puts the caret inside its first slot, so typing continues where
  // the learner is looking. A plain atom just steps past itself.
  const caret: Caret = into
    ? { steps: [...doc.caret.steps, { node: doc.caret.index, slot: into }], index: 0 }
    : { ...doc.caret, index: doc.caret.index + 1 };
  return { nodes, caret };
}

export function insertAtom(doc: Doc, tex: string, ans: string): Doc {
  return insert(doc, { kind: 'atom', tex, ans });
}

export function insertFraction(doc: Doc): Doc {
  return insert(doc, { kind: 'frac', num: [], den: [] }, 'num');
}

export function insertRoot(doc: Doc): Doc {
  return insert(doc, { kind: 'root', arg: [] }, 'arg');
}

/**
 * Open a function such as sin, with the caret inside its brackets.
 *
 * A template rather than the `sin(` atom the calculus keypads insert, so there
 * is no closing bracket to find and nothing typed after the angle can end up
 * inside it by accident.
 */
export function insertFn(doc: Doc, name: string, unit: 'degrees' | 'radians'): Doc {
  return insert(doc, { kind: 'fn', name, unit, arg: [] }, 'arg');
}

/**
 * Raise to a power.
 *
 * A second `^` pressed straight after an exponent nests inside it rather than
 * becoming a sibling. Two reasons, and they agree:
 *
 * - `x^{2}^{3}` is a KaTeX "double superscript" error, so the learner would see
 *   a red parse error where their answer should be.
 * - mathjs reads `x^2^3` right-associatively, as x^(2^3), which is the ordinary
 *   convention. Nesting is what makes the displayed formula and the graded
 *   string mean the same thing, which is the whole point of this key.
 */
export function insertSup(doc: Doc): Doc {
  const list = listAt(doc.nodes, doc.caret.steps);
  const before = doc.caret.index > 0 ? list[doc.caret.index - 1] : undefined;
  if (before && before.kind === 'sup') {
    const steps = [...doc.caret.steps, { node: doc.caret.index - 1, slot: 'arg' as const }];
    const inside: Doc = { nodes: doc.nodes, caret: { steps, index: before.arg.length } };
    return insert(inside, { kind: 'sup', arg: [] }, 'arg');
  }
  return insert(doc, { kind: 'sup', arg: [] }, 'arg');
}

/**
 * Backspace.
 *
 * At the start of a slot it steps out rather than deleting the node it is
 * inside, so a half-typed fraction is escaped with its contents intact.
 *
 * The one exception is a template with nothing in it at all, which is deleted by
 * the same press that leaves it. Stepping out lands the caret *before* the node,
 * where backspace has nothing to its left and so does nothing — an empty
 * fraction opened by a mistaken tap was a dead end that two presses could not
 * clear. There is no content to protect in that case, so escaping and deleting
 * are the same intention.
 */
export function deleteBack(doc: Doc): Doc {
  const { steps, index } = doc.caret;
  if (index > 0) {
    const list = listAt(doc.nodes, steps);
    const next = [...list.slice(0, index - 1), ...list.slice(index)];
    return { nodes: replaceAt(doc.nodes, steps, next), caret: { steps, index: index - 1 } };
  }
  if (steps.length === 0) return doc;
  const parent = steps.slice(0, -1);
  const last = steps[steps.length - 1];
  const outer = listAt(doc.nodes, parent);
  const node = outer[last.node];
  const caret: Caret = { steps: parent, index: last.node };
  if (node && !isFilled([node])) {
    const next = [...outer.slice(0, last.node), ...outer.slice(last.node + 1)];
    return { nodes: replaceAt(doc.nodes, parent, next), caret };
  }
  return { nodes: doc.nodes, caret };
}

/** The slots of a node, in the order the caret should visit them. */
function slotsOf(node: Node): Step['slot'][] {
  if (node.kind === 'frac') return ['num', 'den'];
  if (node.kind === 'root' || node.kind === 'sup' || node.kind === 'fn') return ['arg'];
  return [];
}

export function moveLeft(doc: Doc): Doc {
  const { steps, index } = doc.caret;
  if (index > 0) {
    const list = listAt(doc.nodes, steps);
    const before = list[index - 1];
    const slots = slotsOf(before);
    // Stepping left into a template lands at the end of its *last* slot, which
    // is where the eye is coming from.
    if (slots.length > 0) {
      const slot = slots[slots.length - 1];
      const inner = slotOf(before, slot);
      return { ...doc, caret: { steps: [...steps, { node: index - 1, slot }], index: inner.length } };
    }
    return { ...doc, caret: { steps, index: index - 1 } };
  }
  if (steps.length === 0) return doc;
  const parent = steps.slice(0, -1);
  const last = steps[steps.length - 1];
  const node = listAt(doc.nodes, parent)[last.node];
  const slots = node ? slotsOf(node) : [];
  const at = slots.indexOf(last.slot);
  // Out of the first slot leaves the node entirely; out of a later one moves
  // back into the slot before it.
  if (at > 0) {
    const slot = slots[at - 1];
    const inner = slotOf(node, slot);
    return { ...doc, caret: { steps: [...parent, { node: last.node, slot }], index: inner.length } };
  }
  return { ...doc, caret: { steps: parent, index: last.node } };
}

export function moveRight(doc: Doc): Doc {
  const { steps, index } = doc.caret;
  const list = listAt(doc.nodes, steps);
  if (index < list.length) {
    const next = list[index];
    const slots = slotsOf(next);
    if (slots.length > 0) {
      return { ...doc, caret: { steps: [...steps, { node: index, slot: slots[0] }], index: 0 } };
    }
    return { ...doc, caret: { steps, index: index + 1 } };
  }
  if (steps.length === 0) return doc;
  const parent = steps.slice(0, -1);
  const last = steps[steps.length - 1];
  const node = listAt(doc.nodes, parent)[last.node];
  const slots = node ? slotsOf(node) : [];
  const at = slots.indexOf(last.slot);
  if (at >= 0 && at < slots.length - 1) {
    return { ...doc, caret: { steps: [...parent, { node: last.node, slot: slots[at + 1] }], index: 0 } };
  }
  return { ...doc, caret: { steps: parent, index: last.node + 1 } };
}

/* ---------- the two serialisations ---------- */

/**
 * An empty slot still has to occupy space, or a fraction with nothing in it
 * collapses to a line and there is nowhere to aim. `\square` is KaTeX's own
 * placeholder box.
 */
const PLACEHOLDER = '\\square';

function sameSteps(a: Step[], b: Step[]): boolean {
  return a.length === b.length && a.every((s, i) => s.node === b[i].node && s.slot === b[i].slot);
}

/**
 * What the learner reads.
 *
 * The caret is drawn inside the formula rather than beside it, because that is
 * the whole point — it has to sit between the two characters it will type
 * between. `\htmlClass` is the only way to hand a class to something KaTeX
 * renders, so the stylesheet can make it blink.
 */
export function toTex(nodes: Node[], caret?: Caret, steps: Step[] = []): string {
  const here = caret && sameSteps(caret.steps, steps);
  const pieces: string[] = [];

  nodes.forEach((node, idx) => {
    if (here && caret.index === idx) pieces.push(CARET_TEX);
    if (node.kind === 'atom') {
      pieces.push(node.tex);
    } else if (node.kind === 'frac') {
      const num = toTex(node.num, caret, [...steps, { node: idx, slot: 'num' }]);
      const den = toTex(node.den, caret, [...steps, { node: idx, slot: 'den' }]);
      pieces.push(`\\frac{${num || PLACEHOLDER}}{${den || PLACEHOLDER}}`);
    } else if (node.kind === 'root') {
      const arg = toTex(node.arg, caret, [...steps, { node: idx, slot: 'arg' }]);
      pieces.push(`\\sqrt{${arg || PLACEHOLDER}}`);
    } else if (node.kind === 'fn') {
      const arg = toTex(node.arg, caret, [...steps, { node: idx, slot: 'arg' }]);
      pieces.push(`${fnTex(node.name)}\\left(${arg || PLACEHOLDER}\\right)`);
    } else {
      const arg = toTex(node.arg, caret, [...steps, { node: idx, slot: 'arg' }]);
      pieces.push(`^{${arg || PLACEHOLDER}}`);
    }
  });

  if (here && caret.index === nodes.length) pieces.push(CARET_TEX);
  return pieces.join('');
}

const CARET_TEX = '\\htmlClass{mi-caret}{\\mathstrut}';

/** `sin` reads as sin, `asin` as sin to the -1: the calculator's spelling, not mathjs's. */
export function fnTex(name: string): string {
  const inverse = name.startsWith('a');
  const base = `\\${inverse ? name.slice(1) : name}`;
  return inverse ? `${base}^{-1}` : base;
}

/**
 * What mathjs parses. Never displayed.
 *
 * Every slot is bracketed, so `1/2 + x` cannot come out as `1/(2 + x)`: the
 * tree already knows where the fraction ends and the brackets are how that
 * survives being flattened into a string.
 *
 * The *whole fraction* is bracketed again on top of that, which looks redundant
 * and is not. mathjs binds implicit multiplication tighter than division, so
 * `(8)/(2)x^2` parses as `8/(2x^2)` — the brackets around each slot say where
 * the denominator starts and ends but do nothing to stop the next token being
 * dragged into it. A learner typing 4x^2 as a fraction times x^2 was graded
 * wrong until the outer pair went in. Since `/` is only ever reached through
 * the fraction template, bracketing here closes the hole everywhere.
 *
 * An empty slot is written as `()`, which mathjs refuses to read, so the answer
 * comes back as unreadable rather than as a value. It used to be a neutral
 * value — a fraction 0/1, a denominator 1, a root sqrt(0), an exponent 1 — and
 * Check is live as soon as anything else is typed, so `5 + □/□` was a right
 * answer to "5" and `x^□` a right answer to "x". A bare `sqrt()` would not do
 * for the root: mathjs parses it as a call with no argument.
 */
export function toAnswer(nodes: Node[]): string {
  return nodes
    .map((node) => {
      if (node.kind === 'atom') return node.ans;
      if (node.kind === 'frac') return `((${slotAnswer(node.num)})/(${slotAnswer(node.den)}))`;
      if (node.kind === 'root') return `sqrt(${slotAnswer(node.arg)})`;
      // Bracketed whole for the same reason as a fraction, and in degree mode
      // renamed to the degree functions in `expression.ts`. Grading sin() as
      // sin(0) would mark a learner right for a question whose answer happens
      // to be 0.
      if (node.kind === 'fn') {
        const name = node.unit === 'degrees' ? `${node.name}d` : node.name;
        return `(${name}(${slotAnswer(node.arg)}))`;
      }
      return `^(${slotAnswer(node.arg)})`;
    })
    .join('');
}

/** A slot's contents, or `()` — which mathjs will not read — when it is empty. */
function slotAnswer(nodes: Node[]): string {
  return toAnswer(nodes) || '()';
}

/** True once there is something to grade. An empty slot does not count. */
export function isFilled(nodes: Node[]): boolean {
  return nodes.some((node) => {
    if (node.kind === 'atom') return true;
    if (node.kind === 'frac') return isFilled(node.num) || isFilled(node.den);
    return isFilled(node.arg);
  });
}

/* ---------- keys ---------- */

/** Keys whose two audiences differ: this one reads as × and parses as *. */
const ATOM_TEX: Record<string, string> = {
  '*': '\\times',
  'ln(': '\\ln(',
  'sin(': '\\sin(',
  'cos(': '\\cos(',
  'log(': '\\log(',
};

/**
 * A letter key that inserts its letter bracketed, `(a)`, and reads as the bare
 * letter.
 *
 * The formula keypads need this because of how mathjs reads letters side by
 * side: `at` is one symbol named "at", not a times t, and `b(l + w)` is a call
 * to a function named b. So a learner typing $u + at$ or $b(l + w)$ exactly as
 * it is printed would be marked wrong for a right answer. `(a)(t)` and
 * `(b)(l + w)` are products. `(pi)` is π, for the same reason: `r pi` would be
 * read as one symbol too.
 */
const BRACKETED_LETTER = /^\(([A-Za-z]|pi)\)$/;

/**
 * How a keypad key becomes an edit.
 *
 * Two keys the generators already declare are templates rather than characters
 * now, so a fraction is stacked and a root has a bar over it while it is being
 * typed. Mapping them here rather than changing every generator means no
 * content file has to know the editor exists.
 */
export function applyKey(doc: Doc, key: KeypadKey): Doc {
  if (key.fn) return insertFn(doc, key.insert, key.fn);
  if (key.insert === '/') return insertFraction(doc);
  if (key.insert === 'sqrt(') return insertRoot(doc);
  if (key.insert === '^') return insertSup(doc);
  const letter = BRACKETED_LETTER.exec(key.insert)?.[1];
  if (letter) return insertAtom(doc, letter === 'pi' ? '\\pi ' : letter, key.insert);
  return insertAtom(doc, ATOM_TEX[key.insert] ?? key.insert, key.insert);
}

/** The editor as a slide's `prefill` leaves it: those keys pressed in order. */
export function docFromKeys(keys: readonly KeypadKey[] = []): Doc {
  return keys.reduce(applyKey, EMPTY_DOC);
}

/* ---------- the slot ---------- */

export function MathSlot({
  doc,
  showCaret,
  filled,
}: {
  doc: Doc;
  showCaret: boolean;
  filled: boolean;
}) {
  const tex = useMemo(
    () => toTex(doc.nodes, showCaret ? doc.caret : undefined),
    [doc, showCaret],
  );

  return (
    <span className={`answer-slot${filled ? ' filled' : ''}${showCaret ? ' focus' : ''}`}>
      {tex ? <Tex tex={tex} trust /> : ' '}
    </span>
  );
}
