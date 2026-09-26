/**
 * Algebraic Fractions, level 9: rearranging formulae with fractions.
 *
 * The subject on the bottom of a fraction, then the subject twice (the key
 * method: multiply up, collect, factorise, divide), inverse functions found by
 * that method, sums of reciprocals from physics, and rearranging before
 * substituting. Every pure rearrangement collects the subject's terms on the
 * left, so each answer has one form. Generators are in
 * `generators/fractionsLevel9.ts`.
 */
import type { Level } from '../../types';
import { ask, askAfter, maths, prose, teach, working } from './blocks';

export const level9: Level = {
  id: 'af-l9',
  title: 'Rearranging Formulae with Fractions',
  lessons: [
    {
      id: 'af-l9-bottom',
      title: 'The Subject on the Bottom',
      slides: [
        teach(
          prose(
            'To rearrange a formula, undo what has been done to the letter you want, one step at a time, doing the same to both sides. When that letter is in the bottom of a fraction, multiply both sides by the bottom first, so the letter is no longer under a line.',
          ),
          prose('To make $t$ the subject of $s = \\frac{d}{t}$, multiply both sides by $t$, then divide both sides by $s$:'),
          working('&s = \\frac{d}{t}', '&st = d', '&t = \\frac{d}{s}'),
        ),
        ask('af9-bottom-letters'),
        askAfter(
          'af9-bottom-steps',
          1,
          prose('The same works when the bottom is a bracket. Multiply by the whole bracket, divide, then take the number over:'),
          working('&y = \\frac{6}{x + 2}', '&y(x + 2) = 6', '&x + 2 = \\frac{6}{y}', '&x = \\frac{6}{y} - 2'),
        ),
        ask('af9-bottom-place'),
        teach(
          prose(
            'A number added to the fraction is outside it, so it comes off first. Only then is the fraction on its own, ready to be multiplied up:',
          ),
          working(
            '&y = \\frac{6}{x + 2} + 3',
            '&y - 3 = \\frac{6}{x + 2}',
            '&(y - 3)(x + 2) = 6',
            '&x + 2 = \\frac{6}{y - 3}',
            '&x = \\frac{6}{y - 3} - 2',
          ),
          prose('Multiplying first would multiply the 3 as well, and $x$ would end up in two places.'),
        ),
        ask('af9-bottom-steps', 2),
        ask('af9-bottom-plan'),
        teach(
          prose('In a physics formula every letter is a quantity, and the moves are the same. A sum in the bottom is multiplied up as one bracket:'),
          working('&I = \\frac{V}{R + r}', '&I(R + r) = V', '&R + r = \\frac{V}{I}', '&r = \\frac{V}{I} - R'),
          prose(
            'A difference on top waits until the bottom has gone. From $a = \\frac{v - u}{t}$, multiply by $t$, then move whichever letter is not wanted:',
          ),
          working('&at = v - u'),
          maths('v = at + u \\qquad \\text{or} \\qquad u = v - at'),
        ),
        ask('af9-bottom-letters', 2),
        askAfter(
          'af9-bottom-place',
          2,
          prose(
            'With a number in front of $x$, multiply up and multiply out, move the other term across, then divide. Write the answer as one fraction:',
          ),
          working('&y = \\frac{6}{2x + 3}', '&2xy + 3y = 6', '&2xy = 6 - 3y', '&x = \\frac{6 - 3y}{2y}'),
        ),
      ],
      skillCheck: [ask('af9-bottom-place', 2), ask('af9-bottom-steps', 2), ask('af9-bottom-letters', 2)],
    },
    {
      id: 'af-l9-twice',
      title: 'The Subject Twice',
      slides: [
        teach(
          prose(
            'In $y = \\frac{x + 3}{x - 2}$ the $x$ appears twice, on top and on the bottom, so undoing one step at a time never gets it alone. The way through has four steps.',
          ),
          prose('Multiply up, and multiply out:'),
          working('&y(x - 2) = x + 3', '&xy - 2y = x + 3'),
          prose('Collect every term with $x$ in it on the left and everything else on the right. Each term changes sign as it crosses:'),
          working('&xy - x = 2y + 3'),
          prose('Every term on the left has an $x$, so take it out as a factor, then divide by the bracket:'),
          working('&x(y - 1) = 2y + 3', '&x = \\frac{2y + 3}{y - 1}'),
        ),
        ask('af9-twice-steps'),
        ask('af9-twice-place'),
        ask('af9-factor-tree'),
        teach(
          prose('Numbers in front of the $x$ terms change nothing about the method. They end up in the bracket:'),
          working(
            '&y = \\frac{2x + 1}{3x - 4}',
            '&3xy - 4y = 2x + 1',
            '&3xy - 2x = 4y + 1',
            '&x(3y - 2) = 4y + 1',
            '&x = \\frac{4y + 1}{3y - 2}',
          ),
        ),
        ask('af9-twice-steps', 2),
        ask('af9-factor-tree', 2),
        teach(
          prose(
            'Collecting the $x$ terms on the right instead gives the same answer in another form. From $3xy - 4y = 2x + 1$, every term crosses the other way, so every sign changes:',
          ),
          working('&{-4y} - 1 = 2x - 3xy', '&{-4y} - 1 = x(2 - 3y)', '&x = \\frac{-4y - 1}{2 - 3y}'),
          prose(
            'The top and the bottom have both changed sign, which is multiplying by $\\frac{-1}{-1} = 1$, so it is the same fraction. In these lessons the $x$ terms go on the left, so each answer has one form.',
          ),
        ),
        ask('af9-twice-equal', 2),
        ask('af9-twice-place', 2),
      ],
      skillCheck: [ask('af9-twice-steps', 2), ask('af9-twice-place', 2), ask('af9-factor-tree', 2)],
    },
    {
      id: 'af-l9-inverse',
      title: 'Inverse Functions of Fractions',
      slides: [
        teach(
          prose(
            'The inverse $f^{-1}$ undoes $f$. To find it, write $y = f(x)$, make $x$ the subject, then write the answer with $x$ in place of $y$. For $f(x) = \\frac{x + 1}{x - 3}$:',
          ),
          working('&y(x - 3) = x + 1', '&xy - 3y = x + 1', '&xy - x = 3y + 1', '&x(y - 1) = 3y + 1', '&x = \\frac{3y + 1}{y - 1}'),
          maths('f^{-1}(x) = \\frac{3x + 1}{x - 1}'),
          prose('It is not $\\frac{1}{f(x)}$: the $-1$ names the inverse, it is not a power.'),
        ),
        ask('af9-inverse-place'),
        ask('af9-inverse-steps'),
        ask('af9-inverse-place+choice'),
        teach(
          prose(
            'The value of $f^{-1}$ at a number is the $x$ that $f$ sends to that number. Find $f^{-1}$, then substitute. For $f(x) = \\frac{2x + 1}{x - 3}$ the key method gives:',
          ),
          working('&f^{-1}(x) = \\frac{3x + 1}{x - 2}', '&f^{-1}(3) = \\frac{3 \\times 3 + 1}{3 - 2} = 10'),
          prose('Check: $f(10) = \\frac{21}{7} = 3$. Solving $f(x) = 3$ gives the same $x$, since that is what the inverse does.'),
        ),
        ask('af9-inverse-value'),
        ask('af9-inverse-steps', 2),
        teach(
          prose(
            '$f^{-1}(x) = \\frac{3x + 1}{x - 1}$ has a bottom of zero at $x = 1$, so it is not defined there. That is the one value $f$ never reaches: as $x$ grows, $\\frac{x + 1}{x - 3}$ gets closer and closer to 1.',
          ),
          prose('In general, the method turns $f(x) = \\frac{ax + b}{cx + d}$ into'),
          maths('f^{-1}(x) = \\frac{b - dx}{cx - a}'),
          prose(
            'which is not defined at $x = \\frac{a}{c}$. When the number on the bottom of $f$ is minus the number in front of $x$ on top, $d = -a$, the inverse is $\\frac{ax + b}{cx - a}$: $f$ itself. Such a function is its own inverse.',
          ),
        ),
        ask('af9-inverse-excluded'),
        ask('af9-self-inverse'),
      ],
      skillCheck: [ask('af9-inverse-place', 2), ask('af9-inverse-value', 2), ask('af9-inverse-excluded', 2)],
    },
    {
      id: 'af-l9-reciprocals',
      title: 'Sums of Reciprocals',
      slides: [
        teach(
          prose('Resistors in parallel combine by adding reciprocals:'),
          maths('\\frac{1}{R} = \\frac{1}{R_1} + \\frac{1}{R_2}'),
          prose(
            'To make $R$ the subject, write the right side as one fraction, each top times the other bottom. Then each side is a single fraction, so both can be turned upside down:',
          ),
          working('&\\frac{1}{R} = \\frac{R_1 + R_2}{R_1 R_2}', '&R = \\frac{R_1 R_2}{R_1 + R_2}'),
          prose('Turning over one term at a time is wrong: $R$ is not $R_1 + R_2$.'),
        ),
        ask('af9-parallel-tree'),
        askAfter(
          'af9-recip-place',
          1,
          prose(
            'The lens formula, $\\frac{1}{f} = \\frac{1}{u} + \\frac{1}{v}$, has the same shape. To make $v$ the subject, move $\\frac{1}{u}$ across first, so $\\frac{1}{v}$ is on its own:',
          ),
          working('&\\frac{1}{v} = \\frac{1}{f} - \\frac{1}{u}', '&\\frac{1}{v} = \\frac{u - f}{fu}', '&v = \\frac{fu}{u - f}'),
        ),
        ask('af9-recip-steps'),
        teach(
          prose(
            'Capacitors in series and springs in series add reciprocals in the same way, and so does the same formula in any letters. Some books write the lens formula with a minus sign:',
          ),
          maths('\\frac{1}{f} = \\frac{1}{v} - \\frac{1}{u}'),
          prose('The method is the same; the signs need care. To make $u$ the subject, move $\\frac{1}{u}$ to the left and $\\frac{1}{f}$ to the right:'),
          working('&\\frac{1}{u} = \\frac{1}{v} - \\frac{1}{f}', '&\\frac{1}{u} = \\frac{f - v}{fv}', '&u = \\frac{fv}{f - v}'),
        ),
        ask('af9-recip-place+choice', 2),
        ask('af9-parallel-tree', 2),
        teach(
          prose('To find one of a pair from numbers, rearrange first, then substitute. For resistors in parallel:'),
          maths('R_2 = \\frac{R R_1}{R_1 - R}'),
          prose('With $R = 4$ and $R_1 = 12$:'),
          working('&R_2 = \\frac{4 \\times 12}{12 - 4}', '&R_2 = \\frac{48}{8} = 6'),
        ),
        ask('af9-recip-value'),
        ask('af9-recip-steps', 2),
      ],
      skillCheck: [ask('af9-recip-place', 2), ask('af9-parallel-tree', 2), ask('af9-recip-value', 2)],
    },
    {
      id: 'af-l9-substitute',
      title: 'Rearrange, Then Substitute',
      slides: [
        teach(
          prose(
            'To find one letter from the others, rearrange first, then put the numbers in. There is less arithmetic with fractions that way. To find $r$ from $I = \\frac{V}{R + r}$ when $V = 24$, $I = 3$ and $R = 5$:',
          ),
          working('&r = \\frac{V}{I} - R', '&r = \\frac{24}{3} - 5 = 3'),
          prose('In the same way, $a = \\frac{v - u}{t}$ rearranges to'),
          maths('t = \\frac{v - u}{a} \\qquad \\text{or} \\qquad u = v - at'),
        ),
        ask('af9-sub-value'),
        askAfter(
          'af9-sub-tree',
          1,
          prose('With the subject twice, use the key method first. For $y = \\frac{x + 3}{x - 2}$ and $y = 2$:'),
          working('&x = \\frac{2y + 3}{y - 1}', '&x = \\frac{2 \\times 2 + 3}{2 - 1} = 7'),
        ),
        ask('af9-sub-tree', 2),
        teach(
          prose(
            'Checking a rearrangement means checking each line against the one above it. The usual slips: a term of the bottom not multiplied, a sign not changed as a term crosses, a bracket that does not multiply back out, and a division the wrong way up.',
          ),
          prose('This attempt at $y = \\frac{x + 3}{x - 2}$ goes wrong at line (2):'),
          maths(
            '\\begin{aligned} \\text{(1)}\\quad & xy - 2y = x + 3 \\\\ \\text{(2)}\\quad & xy + x = 2y + 3 \\\\ \\text{(3)}\\quad & x(y + 1) = 2y + 3 \\end{aligned}',
          ),
          prose('The $x$ was taken from the right, so it arrives on the left as $-x$. Line (3) follows from line (2), but that does not rescue it.'),
        ),
        ask('af9-slip-line'),
        ask('af9-slip-flow'),
        teach(
          prose('For the lens formula, $\\frac{1}{f} = \\frac{1}{u} + \\frac{1}{v}$, rearrange for the letter wanted before substituting. Made the subject, $u$ and $f$ are'),
          working('&u = \\frac{fv}{v - f}', '&f = \\frac{uv}{u + v}'),
          prose('From $s = \\frac{(u + v)t}{2}$, multiply by 2 first, then divide by whichever bracket or letter is not wanted:'),
          working('&2s = (u + v)t'),
          maths('t = \\frac{2s}{u + v} \\qquad \\text{or} \\qquad v = \\frac{2s}{t} - u'),
        ),
        ask('af9-sub-value', 2),
        ask('af9-slip-line', 2),
      ],
      skillCheck: [ask('af9-sub-value', 2), ask('af9-sub-tree', 2), ask('af9-slip-line', 2)],
    },
  ],
  levelCheck: [
    ask('af9-bottom-letters', 2),
    ask('af9-bottom-steps', 2),
    ask('af9-bottom-place', 2),
    ask('af9-twice-steps', 2),
    ask('af9-twice-place+choice', 2),
    ask('af9-factor-tree', 2),
    ask('af9-inverse-place', 2),
    ask('af9-inverse-value', 2),
    ask('af9-inverse-excluded', 2),
    ask('af9-recip-place', 2),
    ask('af9-parallel-tree', 2),
    ask('af9-recip-value', 2),
    ask('af9-sub-value', 2),
    ask('af9-sub-tree', 2),
    ask('af9-slip-line', 2),
  ],
};
