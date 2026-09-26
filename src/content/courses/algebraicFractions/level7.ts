/**
 * Level 7: rational equations in context.
 *
 * A rate in a sentence is a fraction: time is distance over speed, the
 * number bought is money over price, a share is a total over the people.
 * Lesson 1 writes those fractions and equations from words; lesson 2 is a
 * journey with and against a current, whose equation clears to a quadratic
 * with one root that cannot be the speed; lesson 3 adds rates of work;
 * lesson 4 gives the formulas for resistors in parallel and a thin lens; and
 * lesson 5 is a shared cost or a changed price. Generators are in
 * `generators/fractionsLevel7.ts`.
 */
import type { Level } from '../../types';
import { ask, askAfter, maths, prose, teach, working } from './blocks';

export const level7: Level = {
  id: 'af-l7',
  title: 'Rational Equations in Context',
  lessons: [
    {
      id: 'af-l7-words',
      title: 'Fractions from Words',
      slides: [
        teach(
          prose('Time is distance divided by speed. When the speed is a letter, the time is an algebraic fraction:'),
          maths('\\text{time} = \\frac{\\text{distance}}{\\text{speed}}'),
          prose(
            'A train travelling 180 km at $x$ km/h takes $\\frac{180}{x}$ hours. Other rates work the same way: £60 buys $\\frac{60}{x}$ tickets at £$x$ each, and £60 shared by $x$ people is $\\frac{60}{x}$ pounds each.',
          ),
          prose('If the train takes 3 hours, the fraction equals 3. Multiply both sides by $x$ to clear it:'),
          working('\\frac{180}{x} &= 3', '180 &= 3x', 'x &= 60'),
        ),
        ask('af7-word-expr'),
        ask('af7-word-value'),
        askAfter(
          'af7-word-expr',
          2,
          prose(
            'A word such as “faster” or “more” changes the bottom. A van 10 km/h faster than a car doing $x$ km/h drives at $x + 10$ km/h, so 180 km takes it $\\frac{180}{x + 10}$ hours. “Slower”, “less” or “fewer” subtracts: $x - 10$.',
          ),
        ),
        teach(
          prose(
            'When two quantities are the same, set their fractions equal. A train travels 150 km in the same time as a car travels 120 km. The car drives at $x$ km/h and the train is 10 km/h faster, so:',
          ),
          maths('\\frac{150}{x + 10} = \\frac{120}{x}'),
          prose('Multiply both sides by both bottoms. Each side becomes its own top times the other side’s bottom:'),
          working('150x &= 120(x + 10)', '150x &= 120x + 1200', '30x &= 1200', 'x &= 40'),
          prose('The car drives at 40 km/h and the train at 50 km/h. Each takes 3 hours.'),
        ),
        ask('af7-equal-setup'),
        ask('af7-equal-steps'),
        ask('af7-word-value', 2),
        teach(
          prose(
            'Something slower, or cheaper, has a minus sign in its bottom. A lorry travels 120 km in the same time as a car travels 160 km. The car drives at $x$ km/h and the lorry is 20 km/h slower:',
          ),
          working('\\frac{120}{x - 20} &= \\frac{160}{x}', '120x &= 160(x - 20)', '120x &= 160x - 3200', '-40x &= -3200', 'x &= 80'),
          prose('Check the answer makes sense: the lorry’s speed, 60 km/h, must be positive, and it is. Each takes 2 hours.'),
        ),
        ask('af7-equal-setup', 2),
        ask('af7-equal-steps', 2),
      ],
      skillCheck: [ask('af7-word-value', 2), ask('af7-equal-setup', 2), ask('af7-equal-steps', 2)],
    },
    {
      id: 'af-l7-journeys',
      title: 'Journeys',
      slides: [
        teach(
          prose(
            'A river’s current carries a boat along. With speed $v$ km/h in still water and a current of 3 km/h, the boat goes faster downstream and slower upstream:',
          ),
          working('\\text{downstream: } & v + 3', '\\text{upstream: } & v - 3'),
          prose(
            'A wind does the same to a cyclist. Each time is distance over speed, and the two times add to the whole trip. 24 km downstream then 6 km upstream, in 3 hours in all, gives:',
          ),
          maths('\\frac{24}{v + 3} + \\frac{6}{v - 3} = 3'),
          prose('Check a speed by putting it in. At $v = 9$ the two times are 2 hours and 1 hour:'),
          working('\\frac{24}{12} + \\frac{6}{6} &= 2 + 1', '&= 3'),
        ),
        ask('af7-journey-setup'),
        ask('af7-journey-check-tree'),
        ask('af7-journey-setup', 2),
        teach(
          prose('To solve, multiply every term by both bottoms, ${(v + 3)(v - 3)}$. Each fraction keeps the bracket it is missing:'),
          working(
            '&24(v - 3) + 6(v + 3)',
            '&\\quad = 3(v^{2} - 9)',
            '&30v - 54 = 3v^{2} - 27',
            '&3v^{2} - 30v + 27 = 0',
            '&v^{2} - 10v + 9 = 0',
          ),
          prose('The fractions have gone and a quadratic is left. Dividing through by 3, the total time, keeps the numbers small.'),
        ),
        ask('af7-journey-quad-tiles'),
        ask('af7-journey-check-tree', 2),
        ask('af7-journey-quad-tiles', 2),
        teach(
          prose('The quadratic factorises:'),
          working('v^{2} - 10v + 9 &= 0', '(v - 9)(v - 1) &= 0'),
          prose(
            'So $v = 9$ or $v = 1$. Both solve the equation, but only one can be the boat. At $v = 1$ the upstream speed is $1 - 3 = -2$ km/h: the current would carry the boat backwards.',
          ),
          prose('Reject a root that is negative, or below the current. Here $v = 9$ km/h. The other root always lies between minus the current and the current, so it is always the one to go.'),
        ),
        ask('af7-journey-reject-flow'),
        ask('af7-journey-solve', 2),
      ],
      skillCheck: [ask('af7-journey-quad-tiles', 2), ask('af7-journey-reject-flow', 2), ask('af7-journey-solve', 2)],
    },
    {
      id: 'af-l7-together',
      title: 'Working Together',
      slides: [
        teach(
          prose(
            'A pipe that fills a tank in 6 hours fills $\\frac{1}{6}$ of it each hour. Working together, rates add. With a second pipe that fills the tank in 12 hours:',
          ),
          working('\\frac{1}{6} + \\frac{1}{12} &= \\frac{2}{12} + \\frac{1}{12}', '&= \\frac{3}{12}', '&= \\frac{1}{4}'),
          prose(
            'Together they fill $\\frac{1}{4}$ of the tank each hour, so the whole tank takes 4 hours. If one takes $a$ hours alone, the other $b$ hours, and both together $t$ hours:',
          ),
          maths('\\frac{1}{a} + \\frac{1}{b} = \\frac{1}{t}'),
        ),
        ask('af7-together-tree'),
        ask('af7-together-time'),
        teach(
          prose('To find one worker’s time alone, take the known rate from the rate together. Ana and Ben take 4 hours together, and Ana alone takes 6. Let Ben take $x$ hours:'),
          working(
            '\\frac{1}{6} + \\frac{1}{x} &= \\frac{1}{4}',
            '\\frac{1}{x} &= \\frac{1}{4} - \\frac{1}{6}',
            '&= \\frac{3}{12} - \\frac{2}{12}',
            '&= \\frac{1}{12}',
            'x &= 12',
          ),
          prose('A drain works against a tap, so its rate is taken away. A tap fills a bath in 4 minutes and the drain empties it in 12:'),
          working('\\frac{1}{4} - \\frac{1}{12} &= \\frac{3}{12} - \\frac{1}{12}', '&= \\frac{2}{12} = \\frac{1}{6}'),
          prose('With both running, the bath fills in 6 minutes.'),
        ),
        ask('af7-together-setup'),
        ask('af7-alone-steps'),
        ask('af7-together-time', 2),
        ask('af7-together-tree', 2),
        teach(
          prose(
            'When one time is given in terms of the other, the equation becomes a quadratic. Pipe B takes 6 hours longer than pipe A, and together they take 4 hours. Let pipe A take $x$ hours, so pipe B takes $x + 6$:',
          ),
          maths('\\frac{1}{x} + \\frac{1}{x + 6} = \\frac{1}{4}'),
          prose('Multiply every term by ${4x(x + 6)}$:'),
          working('&4(x + 6) + 4x = x(x + 6)', '&8x + 24 = x^{2} + 6x', '&0 = x^{2} - 2x - 24', '&0 = (x - 6)(x + 4)'),
          prose('A time cannot be negative, so reject $x = -4$. Pipe A takes 6 hours and pipe B 12.'),
        ),
        ask('af7-together-setup', 2),
        ask('af7-longer-solve', 2),
      ],
      skillCheck: [ask('af7-together-time', 2), ask('af7-alone-steps', 2), ask('af7-longer-solve', 2)],
    },
    {
      id: 'af-l7-lenses',
      title: 'Lenses and Resistors',
      slides: [
        teach(
          prose(
            'Resistors joined side by side are in parallel. Their total resistance $R$, in ohms ($\\Omega$), comes from this formula, which is given: you do not need to know where it comes from.',
          ),
          maths('\\frac{1}{R} = \\frac{1}{R_1} + \\frac{1}{R_2}'),
          prose('For $6\\,\\Omega$ and $3\\,\\Omega$, add the fractions over a common bottom:'),
          working('\\frac{1}{R} &= \\frac{1}{6} + \\frac{1}{3}', '&= \\frac{1}{6} + \\frac{2}{6}', '&= \\frac{3}{6} = \\frac{1}{2}', 'R &= 2'),
          prose('So $R = 2\\,\\Omega$, less than either resistor.'),
        ),
        ask('af7-parallel-tree'),
        askAfter(
          'af7-parallel-tree',
          2,
          prose('A third resistor in parallel adds a third fraction. For $2\\,\\Omega$, $3\\,\\Omega$ and $6\\,\\Omega$:'),
          working('\\frac{1}{R} &= \\frac{1}{2} + \\frac{1}{3} + \\frac{1}{6}', '&= \\frac{3}{6} + \\frac{2}{6} + \\frac{1}{6}', '&= \\frac{6}{6} = 1', 'R &= 1'),
        ),
        teach(
          prose('When the total is known and one resistor is missing, take the known fraction from both sides. A total of $4\\,\\Omega$ with $R_1 = 12\\,\\Omega$:'),
          working(
            '\\frac{1}{R_2} &= \\frac{1}{4} - \\frac{1}{12}',
            '&= \\frac{3}{12} - \\frac{1}{12}',
            '&= \\frac{2}{12} = \\frac{1}{6}',
            'R_2 &= 6',
          ),
          prose('Fractions are not taken away by taking away their bottoms: $12 - 4 = 8$ is not the answer.'),
        ),
        ask('af7-formula-which'),
        ask('af7-parallel-missing'),
        ask('af7-parallel-missing+choice', 2),
        teach(
          prose(
            'A thin lens follows a formula of the same shape, also given. $u$ is the object’s distance from the lens, $v$ the image’s distance, and $f$ the focal length, all in cm:',
          ),
          maths('\\frac{1}{f} = \\frac{1}{u} + \\frac{1}{v}'),
          prose('To find $f$, add, as for resistors. To find $v$, take $\\frac{1}{u}$ from both sides. For $f = 10$ and $u = 15$:'),
          working('\\frac{1}{v} &= \\frac{1}{10} - \\frac{1}{15}', '&= \\frac{3}{30} - \\frac{2}{30}', '&= \\frac{1}{30}', 'v &= 30'),
        ),
        ask('af7-lens-focal'),
        ask('af7-lens-steps'),
        ask('af7-formula-which', 2),
      ],
      skillCheck: [ask('af7-parallel-tree', 2), ask('af7-parallel-missing', 2), ask('af7-lens-steps', 2)],
    },
    {
      id: 'af-l7-sharing',
      title: 'Prices and Sharing',
      slides: [
        teach(
          prose(
            'A cost shared equally is the cost over the number of people. A minibus costs £120 to hire. Shared by $x$ people, each pays $\\frac{120}{x}$ pounds; if 2 more come, each pays $\\frac{120}{x + 2}$.',
          ),
          prose('If the extra people cut each share by £5, the first share minus the second is 5:'),
          maths('\\frac{120}{x} - \\frac{120}{x + 2} = 5'),
          prose('The larger share comes first, so the difference is positive. Check a value by putting it in. At $x = 6$ each pays £20, or £15 with two more:'),
          working('\\frac{120}{6} - \\frac{120}{8} &= 20 - 15', '&= 5'),
        ),
        ask('af7-share-setup'),
        ask('af7-share-check-tree'),
        ask('af7-share-setup', 2),
        teach(
          prose('To solve, multiply every term by ${x(x + 2)}$. Each fraction keeps the bracket it is missing:'),
          working(
            '&120(x + 2) - 120x',
            '&\\quad = 5x(x + 2)',
            '&240 = 5x^{2} + 10x',
            '&0 = x^{2} + 2x - 48',
            '&0 = (x - 6)(x + 8)',
          ),
          prose('Dividing through by 5 kept the numbers small. A group cannot have $-8$ people, so $x = 6$.'),
        ),
        ask('af7-share-quad-tiles'),
        ask('af7-share-solve'),
        ask('af7-share-quad-tiles', 2),
        teach(
          prose('The same equation fits a price. Sam spends £60 on books at £$x$ each. Had each cost £2 more, he would have bought 1 fewer:'),
          working(
            '&\\frac{60}{x} - \\frac{60}{x + 2} = 1',
            '&60(x + 2) - 60x = x(x + 2)',
            '&0 = x^{2} + 2x - 120',
            '&0 = (x - 10)(x + 12)',
          ),
          prose('A price cannot be negative, so the books cost £10 each. A journey fits too: 200 km at $x$ km/h, saving 1 hour by going 10 km/h faster, gives the equation below, and $x = 40$.'),
          maths('\\frac{200}{x} - \\frac{200}{x + 10} = 1'),
        ),
        ask('af7-share-solve+choice', 2),
        ask('af7-share-check-tree', 2),
      ],
      skillCheck: [ask('af7-share-setup', 2), ask('af7-share-quad-tiles', 2), ask('af7-share-solve', 2)],
    },
  ],
  levelCheck: [
    ask('af7-word-expr', 2),
    ask('af7-word-value', 2),
    ask('af7-equal-steps', 2),
    ask('af7-journey-setup', 2),
    ask('af7-journey-quad-tiles', 2),
    ask('af7-journey-solve', 2),
    ask('af7-together-time', 2),
    ask('af7-alone-steps', 2),
    ask('af7-longer-solve', 2),
    ask('af7-parallel-missing', 2),
    ask('af7-lens-steps', 2),
    ask('af7-lens-focal', 2),
    ask('af7-share-quad-tiles', 2),
    ask('af7-share-solve', 2),
  ],
};
