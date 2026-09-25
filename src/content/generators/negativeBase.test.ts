/**
 * A negative number raised to a power is written in brackets.
 *
 * `-1^{4}` is minus one: the power binds tighter than the minus. complex-power
 * once asked "What is $-1^{4}$?" with the answer 1, so the learner who read it
 * correctly and typed -1 was marked wrong, and four more generators wrote the
 * same thing in their working (`-2^{2} = 4`, `-9^{2} - 4 \times -1 = 85`).
 *
 * The sweep cannot see this: the answer is right for the question that was
 * meant, and only the display says something else. So every check here reads
 * the TeX the learner is shown, evaluates it with mathjs under the ordinary
 * precedence, and requires every link of every equation to hold, and the
 * question to come to the answer the slide grades against.
 */
import { describe, expect, it } from 'vitest';
import { complex, evaluate, type Complex } from 'mathjs';
import { makeRng } from '../../engine/rng';
import { choiceVariant } from '../choiceVariant';
import type { Generator, Slide, SolutionStep } from '../types';
import { arithmeticGenerators } from './complexArithmetic';
import { planeGenerators } from './complexPlane';
import { differentiationGenerators } from './differentiation';
import { quadraticsGenerators } from './quadratics';

const SEEDS = 300;
const DIFFICULTIES = [1, 2];

const byId = (list: Generator<unknown>[], id: string) => {
  const found = list.find((g) => g.id === id);
  if (!found) throw new Error(`no generator ${id}`);
  return found;
};

const power = byId(planeGenerators as Generator<unknown>[], 'complex-power');
const powerChoice = choiceVariant(power) as Generator<unknown>;
const reverse = byId(planeGenerators as Generator<unknown>[], 'power-reverse');
const conjugate = byId(arithmeticGenerators as Generator<unknown>[], 'complex-conjugate');
const second = byId(differentiationGenerators as Generator<unknown>[], 'df-second-derivative');
const method = byId(quadraticsGenerators as Generator<unknown>[], 'quad-choose-method');

/** TeX as mathjs reads it, with the precedence a reader gives it. Undefined when it is not a number. */
function valueOf(tex: string): Complex | undefined {
  const source = tex
    .replace(/\\left|\\right/g, '')
    .replace(/\\times/g, '*')
    .replace(/\^\{([^{}]*)\}/g, '^($1)')
    .trim();
  try {
    const value = evaluate(source);
    return typeof value === 'number' || (value && typeof value === 'object' && 're' in value) ? complex(value) : undefined;
  } catch {
    return undefined;
  }
}

const same = (p: Complex, q: Complex) => Math.abs(p.re - q.re) < 1e-9 && Math.abs(p.im - q.im) < 1e-9;

/** A bracketed negative number raised to a power: what this file is about. */
const NEGATIVE_BASE = /(?:\\left)?\(-\d+(?:\\right)?\)\^/;

/**
 * Every `a = b` link between two parts that are numbers must hold. Returns how
 * many links carried a bracketed negative base, so a caller can tell the check
 * was not vacuous.
 */
function checkEquations(tex: string, where: string): number {
  const parts = tex.split('=').map((part) => part.trim()).filter(Boolean);
  let negatives = 0;
  for (let i = 1; i < parts.length; i += 1) {
    const left = valueOf(parts[i - 1]);
    const right = valueOf(parts[i]);
    if (!left || !right) continue;
    expect(same(left, right), `${where}: ${parts[i - 1]} = ${parts[i]} is ${left.toString()} = ${right.toString()}`).toBe(true);
    if (NEGATIVE_BASE.test(parts[i - 1]) || NEGATIVE_BASE.test(parts[i])) negatives += 1;
  }
  return negatives;
}

/** Every equation in a worked solution: the tex lines, and the inline maths of the prose. */
function checkSolution(steps: SolutionStep[], where: string): number {
  let negatives = 0;
  for (const step of steps) {
    if (step.tex) negatives += checkEquations(step.tex, where);
    for (const match of (step.text ?? '').matchAll(/\$([^$]+)\$/g)) negatives += checkEquations(match[1], where);
  }
  return negatives;
}

/** The inline maths of the first prose block that has any. */
function mathOf(slide: Slide): string {
  if (!('prompt' in slide)) throw new Error(`${slide.kind} has no prompt`);
  for (const block of slide.prompt) {
    const tex = block.kind === 'prose' ? /\$([^$]+)\$/.exec(block.text)?.[1] : undefined;
    if (tex) return tex;
  }
  throw new Error('no maths in the prompt');
}

function* draws(generator: Generator<unknown>) {
  for (const difficulty of DIFFICULTIES) {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const params = generator.sample(makeRng(seed), difficulty);
      yield { params, where: `${generator.id} seed ${seed} d${difficulty}` };
    }
  }
}

describe('a negative base is bracketed before a power', () => {
  it('complex-power asks a question that comes to its answer', () => {
    let negatives = 0;
    for (const { params, where } of draws(power)) {
      const slide = power.render(params);
      if (slide.kind !== 'expression') throw new Error(`rendered ${slide.kind}`);
      const answer = valueOf(slide.answer);
      if (!answer) throw new Error(`${where}: unreadable answer ${slide.answer}`);
      // The question as the prompt asks it, and as the lead beside the input writes it.
      for (const asked of [mathOf(slide), (slide.lead ?? '').replace(/=\s*$/, '')]) {
        const value = valueOf(asked);
        expect(value && same(value, answer), `${where}: ${asked} is ${value?.toString()}, answer ${slide.answer}`).toBe(true);
        if (NEGATIVE_BASE.test(asked)) negatives += 1;
      }
      negatives += checkSolution(power.solution(params), where);
    }
    expect(negatives).toBeGreaterThan(0);
  });

  it('complex-power+choice marks correct the option the question comes to', () => {
    for (const { params, where } of draws(powerChoice)) {
      const slide = powerChoice.render(params);
      if (slide.kind !== 'choice') throw new Error(`rendered ${slide.kind}`);
      const display = slide.prompt.find((block) => block.kind === 'display');
      if (display?.kind !== 'display') throw new Error(`${where}: no displayed question`);
      const asked = valueOf(display.tex);
      const right = slide.options.find((option) => option.id === slide.correctId);
      const value = right && valueOf(right.label);
      expect(asked && value && same(asked, value), `${where}: ${display.tex} against ${right?.label}`).toBe(true);
    }
  });

  it('power-reverse works each power out correctly, and its answer reaches w', () => {
    let negatives = 0;
    for (const { params, where } of draws(reverse)) {
      const slide = reverse.render(params);
      if (slide.kind !== 'choice') throw new Error(`rendered ${slide.kind}`);
      const n = Number(/z\^\{(\d+)\}/.exec(mathOf(slide))?.[1]);
      const display = slide.prompt.find((block) => block.kind === 'display');
      if (display?.kind !== 'display') throw new Error(`${where}: no w`);
      const w = valueOf(display.tex.replace(/^w =/, ''));
      const right = slide.options.find((option) => option.id === slide.correctId);
      const reached = right && valueOf(`(${right.label})^{${n}}`);
      expect(w && reached && same(w, reached), `${where}: (${right?.label})^${n} against ${display.tex}`).toBe(true);
      negatives += checkSolution(reverse.solution(params), where);
    }
    expect(negatives).toBeGreaterThan(0);
  });

  it('complex-conjugate, df-second-derivative and quad-choose-method write working that holds', () => {
    for (const generator of [conjugate, second, method]) {
      let negatives = 0;
      for (const { params, where } of draws(generator)) {
        negatives += checkSolution(generator.solution(params), where);
      }
      expect(negatives, `${generator.id} never showed a negative base`).toBeGreaterThan(0);
    }
  });
});
