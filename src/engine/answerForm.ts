/**
 * The notation a typed answer has to be written in, where the question asks
 * for one.
 *
 * The checker grades by value, and that is usually what we want: `4.2` and
 * `42/10` are the same answer. It goes wrong where the notation is the skill.
 * A question in standard form whose keypad can type `× 10ⁿ` can also type the
 * question straight back, and `3(2 + √5)` equals its own expansion. Those
 * questions used to take a bare number on a keypad with nothing else on it,
 * which kept them honest but meant an answer written the way the question is
 * written (the owner typed `2.92 × 10⁵`, and `20 + 14√7`) could not be given.
 *
 * So the keys are offered and the notation is checked here instead. An answer
 * in the wrong notation is `invalid`, like unreadable input: nothing was
 * graded, it costs nothing, and it says nothing about whether the value was
 * right — the check runs on the form alone, before any value is compared.
 */
import type { MathNode } from 'mathjs';
import type { AnswerForm } from '../content/types';
import { readExponentsAsWritten } from './equivalence';
import { parseExpression } from './expression';

/** Why the answer is not in the form asked, or `undefined` when it is. */
export function formProblem(input: string, form: AnswerForm): string | undefined {
  const parsed = parseExpression(readExponentsAsWritten(input));
  // Unreadable input is reported by the checker itself, in its own words.
  if (!parsed.ok) return undefined;
  const node = parsed.node;
  if (form.kind === 'standardForm') {
    return isNumber(node) || isStandardForm(node)
      ? undefined
      : 'Give one number: written out, or as a × 10ⁿ.';
  }
  return isSurdForm(node, form.radicand)
    ? undefined
    : `Write it as one whole number and one multiple of √${form.radicand}, like p + q√${form.radicand}.`;
}

/* ---------- reading the parsed tree ---------- */

interface Op {
  op: string;
  fn: string;
  args: MathNode[];
  implicit?: boolean;
}

function bare(node: MathNode): MathNode {
  let n = node;
  while (n.type === 'ParenthesisNode') n = (n as unknown as { content: MathNode }).content;
  return n;
}

function asOp(node: MathNode): Op | undefined {
  const n = bare(node);
  return n.type === 'OperatorNode' ? (n as unknown as Op) : undefined;
}

/** A plain number, `-` in front allowed. */
function constantOf(node: MathNode): number | undefined {
  const n = bare(node);
  if (n.type === 'ConstantNode') {
    const value = (n as unknown as { value: unknown }).value;
    return typeof value === 'number' ? value : undefined;
  }
  const op = asOp(n);
  if (op && op.fn === 'unaryMinus' && op.args.length === 1) {
    const inner = constantOf(op.args[0]);
    return inner === undefined ? undefined : -inner;
  }
  return undefined;
}

function isNumber(node: MathNode): boolean {
  return constantOf(node) !== undefined;
}

function isWhole(node: MathNode): boolean {
  const value = constantOf(node);
  return value !== undefined && Number.isInteger(value);
}

/** `a × 10^n` with 1 ≤ |a| < 10 and n whole; a minus sign in front is allowed. */
function isStandardForm(node: MathNode): boolean {
  const op = asOp(node);
  if (!op) return false;
  if (op.fn === 'unaryMinus') return isStandardForm(op.args[0]);
  if (op.fn !== 'multiply' || op.args.length !== 2) return false;
  const front = constantOf(op.args[0]);
  if (front === undefined || Math.abs(front) < 1 || Math.abs(front) >= 10) return false;
  const power = asOp(op.args[1]);
  return (
    power !== undefined &&
    power.fn === 'pow' &&
    constantOf(power.args[0]) === 10 &&
    isWhole(power.args[1])
  );
}

/** `√d`, or a whole number times it, either way round. */
function isRootTerm(node: MathNode, radicand: number): boolean {
  const n = bare(node);
  if (n.type === 'FunctionNode') {
    const fn = n as unknown as { fn: { name: string }; args: MathNode[] };
    return fn.fn.name === 'sqrt' && fn.args.length === 1 && constantOf(fn.args[0]) === radicand;
  }
  const op = asOp(n);
  if (!op) return false;
  if (op.fn === 'unaryMinus') return isRootTerm(op.args[0], radicand);
  if (op.fn !== 'multiply' || op.args.length !== 2) return false;
  const [a, b] = op.args;
  return (isWhole(a) && isRootTerm(b, radicand)) || (isRootTerm(a, radicand) && isWhole(b));
}

/** One whole number and one multiple of √d, in either order, or either alone. */
function isSurdForm(node: MathNode, radicand: number): boolean {
  if (isWhole(node) || isRootTerm(node, radicand)) return true;
  const op = asOp(node);
  if (!op || (op.fn !== 'add' && op.fn !== 'subtract') || op.args.length !== 2) return false;
  const [a, b] = op.args;
  return (isWhole(a) && isRootTerm(b, radicand)) || (isRootTerm(a, radicand) && isWhole(b));
}
