/**
 * A plain-text reading of a TeX string, for a button whose only content is
 * maths.
 *
 * KaTeX marks its visible HTML `aria-hidden` and leaves the accessible copy to
 * a parallel MathML tree, which Chromium does not use when it names a button:
 * a keypad key or a choice option drawn with `<Tex>` alone came out with an
 * empty name. Such a button carries this as its `aria-label` instead.
 *
 * It reads KaTeX's own MathML rather than the TeX, so every command, macro and
 * environment KaTeX understands is already resolved into a handful of
 * structures — fraction, root, power, subscript, accent, table — and only
 * those need a spoken form. Everything else is its text in order.
 */
import katex from 'katex';
import type { KeypadKey } from '../content/types';
import { fnTex } from './mathInput';

interface Element {
  tag: string;
  attrs: Record<string, string>;
  children: (Element | string)[];
}

const TOKEN = /<(\/?)([a-zA-Z]+)((?:\s+[a-zA-Z:-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g;
const ATTR = /([a-zA-Z:-]+)="([^"]*)"/g;

function decode(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** KaTeX's MathML as a tree. Its markup is regular enough not to need a DOM. */
function parseMathml(markup: string): Element {
  const root: Element = { tag: 'root', attrs: {}, children: [] };
  const stack = [root];
  for (const match of markup.matchAll(TOKEN)) {
    const [, closing, tag, attrText, selfClosing, text] = match;
    const top = stack[stack.length - 1];
    if (text !== undefined) {
      top.children.push(decode(text));
    } else if (closing) {
      if (stack.length > 1) stack.pop();
    } else {
      const attrs: Record<string, string> = {};
      for (const [, name, value] of (attrText ?? '').matchAll(ATTR)) attrs[name] = decode(value);
      const element: Element = { tag, attrs, children: [] };
      top.children.push(element);
      if (!selfClosing) stack.push(element);
    }
  }
  return root;
}

/** Symbols read as words. Anything else is left for the screen reader. */
const WORDS: Record<string, string> = {
  '\u2212': 'minus',
  '\u00d7': 'times',
  '\u22c5': 'times',
  '\u00b7': 'times',
  '\u00f7': 'divided by',
  '\u00b1': 'plus or minus',
  '\u2264': 'less than or equal to',
  '\u2265': 'greater than or equal to',
  '\u2260': 'not equal to',
  '\u221e': 'infinity',
  '\u2218': 'degrees',
  // Both `|` and `\mid` come out as U+2223, which a screen reader calls
  // "divides"; whether it means abs, given or such that is not recoverable.
  '\u2223': 'vertical bar',
  '\u21d2': 'implies',
  '\u21d4': 'if and only if',
};

/** Function application, invisible times and friends: nothing to say. */
const INVISIBLE = /[\u2061-\u2064\u200b]/g;

function words(text: string): string {
  return [...text.replace(INVISIBLE, '')].map((ch) => (WORDS[ch] ? ` ${WORDS[ch]} ` : ch)).join('');
}

const ACCENTS: Record<string, (base: string) => string> = {
  '\u203e': (base) => `${base} bar`,
  '\u00af': (base) => `${base} bar`,
  '\u02c9': (base) => `${base} bar`,
  '\u02d9': (base) => `${base} dot`,
  '\u00a8': (base) => `${base} double dot`,
  '\u20d7': (base) => `vector ${base}`,
  '\u2192': (base) => `vector ${base}`,
  '^': (base) => `${base} hat`,
  '~': (base) => `${base} tilde`,
};

const TRIG = /^(sin|cos|tan|sec|csc|cosec|cot)$/;

const RELATION = /^(=|<|>|\u2248|\u2261|less than|greater than|not equal)/;

/** A compound piece is bracketed so it is clear where it ends. */
const group = (spoken: string) => (spoken.includes(' ') ? `(${spoken})` : spoken);

const tidy = (spoken: string) => spoken.replace(/\s+/g, ' ').trim();

function power(base: string, exponent: string): string {
  if (exponent === '2') return `${base} squared`;
  if (exponent === '3') return `${base} cubed`;
  if (exponent === 'degrees') return `${base} degrees`;
  if (exponent === '\u2032') return `${base} prime`;
  if (exponent === '\u2033' || exponent === '\u2032\u2032') return `${base} double prime`;
  if (exponent === 'minus 1' && TRIG.test(base)) return `inverse ${base}`;
  return `${base} to the power ${group(exponent)}`;
}

function limits(base: string, below: string, above?: string): string {
  const name = { '\u222b': 'integral', '\u2211': 'sum', '\u220f': 'product' }[base];
  if (name) return above === undefined ? `${name} over ${below}` : `${name} from ${below} to ${above}`;
  if (base === 'lim') return `limit as ${below}`;
  if (base === 'log') return `log base ${below}`;
  const sub = `${base} sub ${below}`;
  return above === undefined ? sub : power(sub, above);
}

function speak(node: Element | string): string {
  if (typeof node === 'string') return words(node);
  const parts = node.children.map(speak).map(tidy);
  const [first = '', second = '', third = ''] = parts;
  switch (node.tag) {
    case 'annotation':
    case 'mphantom':
      return '';
    case 'mtext':
      // Prose, so a hyphen stays a hyphen.
      return node.children.map((child) => (typeof child === 'string' ? child : speak(child))).join('');
    case 'mfrac':
      return node.attrs.linethickness?.startsWith('0')
        ? `${first} choose ${second}`
        : `${group(first)} over ${group(second)}`;
    case 'msqrt':
      return `square root of ${group(tidy(parts.join(' ')))}`;
    case 'mroot':
      return second === '3' ? `cube root of ${group(first)}` : `root ${second} of ${group(first)}`;
    case 'msup':
      return power(first, second);
    case 'msub':
    case 'munder':
      return limits(first, second);
    case 'msubsup':
    case 'munderover':
      return limits(first, second, third);
    case 'mover': {
      const accent = ACCENTS[second];
      return accent ? accent(first) : `${first} ${second}`;
    }
    case 'mtable': {
      // A column vector reads as a list; a matrix or a system row by row.
      const column = node.children.every((row) => typeof row === 'string' || row.children.length <= 1);
      return parts.join(column ? ', ' : '; ');
    }
    case 'mtr':
      // An aligned row's second cell starts at its relation, so it runs on.
      return parts.reduce((row, cell) => {
        if (row === '') return cell;
        return RELATION.test(cell) ? `${row} ${cell}` : `${row}, ${cell}`;
      }, '');
    default:
      return parts.join(' ');
  }
}

const cache = new Map<string, string>();

/**
 * `\sin(30^{\circ})` reads as "sin (30 degrees)", `\frac{x+1}{2}` as
 * "(x + 1) over 2".
 * Never empty for TeX that draws something: a string KaTeX cannot read falls
 * back to its own characters with the markup stripped.
 */
export function texToSpeech(tex: string): string {
  const known = cache.get(tex);
  if (known !== undefined) return known;
  let spoken = '';
  try {
    const markup = katex.renderToString(tex, { output: 'mathml', throwOnError: true, strict: false });
    spoken = tidy(speak(parseMathml(markup)))
      .replace(/([([{]) /g, '$1')
      .replace(/ ([)\]},;])/g, '$1');
  } catch {
    // Unreadable TeX: whatever the learner sees on the button is the best
    // name there is.
  }
  if (spoken === '') spoken = tidy(tex.replace(/\\[a-zA-Z]+|[{}\\^_]/g, ' '));
  cache.set(tex, spoken);
  return spoken;
}

/**
 * The name of a keypad key whose face is drawn in TeX alone, or `undefined`
 * for a key whose face is text and so names it already.
 *
 * Mirrors `keyFace` in `slides.tsx` branch for branch: a template key is named
 * for what it opens, a function key and a letter key for what they show.
 */
export function keyName(key: KeypadKey): string | undefined {
  if (key.insert === '/') return 'fraction';
  if (key.insert === 'sqrt(') return 'square root';
  if (key.insert === '^') return 'power';
  if (key.fn) return texToSpeech(fnTex(key.insert));
  if (key.tex) return texToSpeech(key.insert);
  return undefined;
}
