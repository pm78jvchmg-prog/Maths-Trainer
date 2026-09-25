/**
 * Contest Math.
 *
 * Competition problems: short to state, harder than they look, and each one
 * turning on a single idea — add every equation at once, count gaps rather
 * than posts, look only at the last digit. The course follows the level plan
 * in `docs/roadmap/levels/contest-math.md`, which maps its 23 levels.
 *
 * Level 1, Mathematical Problem-Solving, samples the four strands a contest
 * draws on (algebra, geometry, counting and number theory) and closes with a
 * lesson of tricks that need a new idea rather than more working. Its
 * generators are in `generators/contestProblemSolving.ts`.
 *
 * Level 2, Equations and Ratios, is percentages, ratios, simple equations and
 * sequences, each turned by one idea; its generators are in
 * `generators/contestEquationsRatios.ts`.
 *
 * Has a band of its own, the last of the maths run, between Advanced Maths
 * and Statistics.
 */
import type { Block, Course, SlideRef } from '../types';

const teach = (...blocks: Block[]): SlideRef => ({
  type: 'literal',
  slide: { kind: 'teach', body: blocks },
});

const ask = (generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
});

const prose = (text: string): Block => ({ kind: 'prose', text });

const maths = (tex: string): Block => ({ kind: 'display', tex });

/** An exercise with a worked example or a line of teaching above it, on the same slide. */
const askAfter = (generatorId: string, difficulty: number, ...leadIn: Block[]): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn,
});

export const contestMath: Course = {
  id: 'contest-math',
  category: 'contest-math',
  position: 10,
  title: 'Contest Math',
  blurb: 'Competition problems: short to state, hard to crack, and each one opened by a single good idea.',
  levels: [
    {
      id: 'cm-l1',
      title: 'Mathematical Problem-Solving',
      lessons: [
        {
          id: 'cm-l1-algebra',
          title: 'Algebra',
          slides: [
            teach(
              prose('Contest questions look long and turn on one idea. Find what stays the same, and the working is short.'),
              prose('A full jar of jam weighs $500$ g. With half the jam gone it weighs $300$ g. The jar is in both weighings, so the difference is the jam that went:'),
              maths('500 - 300 = 200'),
              prose('That was half the jam, so all of it weighs $400$ g, and the jar weighs'),
              maths('500 - 400 = 100'),
            ),
            ask('cm-jar'),
            askAfter(
              'cm-work-rate',
              1,
              prose('Rates: count the work in worker-hours. If $3$ cooks make $6$ pies in $4$ hours, that is $12$ cook-hours for $6$ pies, so $2$ cook-hours a pie.'),
              prose('$10$ pies then take $20$ cook-hours: $5$ cooks need $4$ hours.'),
            ),
            askAfter('cm-jar+choice', 2, prose('With a third left, the part that went is two thirds of the whole: halve it, then treble it.')),
            teach(
              prose('When every unknown appears the same number of times, add all the equations at once.'),
              maths('\\begin{aligned} a + b &= 7 \\\\ a + c &= 9 \\\\ b + c &= 12 \\end{aligned}'),
              prose('Each letter appears twice:'),
              maths('2(a + b + c) = 28'),
              maths('a + b + c = 14'),
              prose('Then $c$ is the total without $a + b$: $14 - 7 = 7$.'),
            ),
            ask('cm-pair-sums'),
            ask('cm-pair-sums-tiles'),
            askAfter(
              'cm-close-fractions',
              1,
              prose('Fractions just under $1$: compare what each is short of $1$.'),
              maths('\\frac{99}{100} = 1 - \\frac{1}{100}'),
              maths('\\frac{199}{201} = 1 - \\frac{2}{201}'),
              prose('Turn the pieces over: $100$ against $100.5$. The bigger number means the smaller piece, so $\\frac{199}{201}$ is larger.'),
            ),
            ask('cm-work-rate+choice', 2),
            ask('cm-pair-sums', 2),
            ask('cm-close-fractions', 2),
          ],
          skillCheck: [ask('cm-jar', 2), ask('cm-pair-sums+choice', 2), ask('cm-work-rate', 2)],
        },
        {
          id: 'cm-l1-geometry',
          title: 'Geometry',
          slides: [
            teach(
              prose('Walk once round any polygon and you turn through a full circle, so its **exterior angles add to** $360^\\circ$.'),
              prose('Each interior angle of a regular polygon is $150^\\circ$. Each exterior angle is'),
              maths('180 - 150 = 30'),
              prose('and there are'),
              maths('360 \\div 30 = 12'),
              prose('sides.'),
            ),
            ask('cm-polygon-sides'),
            askAfter(
              'cm-angle-ratio',
              1,
              prose('Angles in a ratio: count the parts. A triangle in the ratio $2 : 3 : 4$ has $9$ parts sharing $180^\\circ$, so one part is $20^\\circ$ and the largest angle is $4 \\times 20 = 80^\\circ$.'),
            ),
            askAfter('cm-angle-ratio-tiles', 1, prose('A quadrilateral’s angles add to $360^\\circ$ instead, and the parts are counted the same way.')),
            askAfter(
              'cm-clock-angle',
              1,
              prose('Clock hands: the minute hand turns $6^\\circ$ a minute. The hour hand turns $30^\\circ$ an hour and keeps creeping, $\\tfrac{1}{2}^\\circ$ a minute.'),
              prose('At 3:30 the minute hand is at $180^\\circ$ and the hour hand at $90 + 15 = 105^\\circ$, so they are $75^\\circ$ apart.'),
            ),
            teach(
              prose('Slide the pieces of a shape about when that keeps what you are measuring.'),
              prose('Every step of a right-angled staircase slides out to the edge of its bounding rectangle, so the perimeter of a staircase $8$ wide and $5$ tall is'),
              maths('2 \\times (8 + 5) = 26'),
              prose('A rectangular notch cut into one edge slides back the same way, but its two sides are extra.'),
              prose('A square tilted inside a square, its corners cutting each side into $3$ and $4$, leaves four right triangles. The big square is $7^2 = 49$ and the triangles are $4 \\times 6 = 24$, so the tilted square is'),
              maths('49 - 24 = 25 = 3^2 + 4^2'),
            ),
            ask('cm-staircase-perimeter'),
            ask('cm-tilted-square'),
            askAfter('cm-polygon-sides+choice', 2, prose('When an interior angle is $k$ exterior angles, the two together are $k + 1$ exterior angles on a straight line, so that many exterior angles make $180^\\circ$ between them.')),
            ask('cm-clock-angle+choice', 2),
            askAfter('cm-tilted-square+choice', 2, prose('Given the big side and one piece, the other piece is what is left of the side.')),
          ],
          skillCheck: [ask('cm-staircase-perimeter', 2), ask('cm-angle-ratio+choice', 2), ask('cm-clock-angle', 2)],
        },
        {
          id: 'cm-l1-combinatorics',
          title: 'Combinatorics',
          slides: [
            teach(
              prose('Counting is about not counting anything twice, and not missing anything.'),
              prose('$6$ people each shake hands with everyone else once. Each shakes $5$ hands, but that counts every handshake from both sides:'),
              maths('6 \\times 5 \\div 2 = 15'),
              prose('A straight fence $20$ m long with a post every $5$ m has $4$ gaps, and one more post than gaps: $5$ posts.'),
            ),
            ask('cm-handshakes'),
            ask('cm-fence-posts'),
            askAfter(
              'cm-outfits',
              1,
              prose('Choices made one after another multiply: $3$ shirts and $2$ pairs of trousers give $3 \\times 2 = 6$ outfits, since each shirt goes with each pair.'),
            ),
            askAfter('cm-handshakes+choice', 2, prose('Going backwards, $n(n - 1)$ is twice the count, so look for two numbers one apart with that product.')),
            teach(
              prose('To count the multiples of $7$ from $30$ to $100$, count up to $100$ and take away those below $30$:'),
              maths('100 \\div 7 \\to 14, \\quad 29 \\div 7 \\to 4'),
              maths('14 - 4 = 10'),
              prose('To count the digits in page numbers $1$ to $150$, split by length:'),
              maths('9 \\times 1 + 90 \\times 2 + 51 \\times 3 = 342'),
            ),
            ask('cm-count-multiples'),
            ask('cm-page-digits-table'),
            askAfter(
              'cm-fence-posts+choice',
              2,
              prose('Round a closed loop the last gap ends at the first post, so posts equal gaps. Sawing a log into $n$ pieces takes $n - 1$ cuts.'),
            ),
            ask('cm-count-multiples+choice', 2),
            ask('cm-page-digits', 2),
          ],
          skillCheck: [ask('cm-outfits', 2), ask('cm-count-multiples', 2), ask('cm-fence-posts', 2)],
        },
        {
          id: 'cm-l1-number-theory',
          title: 'Number Theory',
          slides: [
            teach(
              prose('Swapping $+n$ for $-n$ changes a total by $2n$, which is even. So the signs never change whether the result is odd or even:'),
              maths('\\pm 1 \\pm 2 \\pm 3 \\text{ has the parity of } 1 + 2 + 3 = 6'),
              prose('Last digits of powers repeat. Powers of $7$ end in $7, 9, 3, 1$ and then start again, so $7^{10}$, with $10 = 4 \\times 2 + 2$, ends in the second, $9$.'),
            ),
            ask('cm-parity-signs'),
            ask('cm-last-digit'),
            askAfter(
              'cm-missing-digit',
              1,
              prose('A number is a multiple of $9$ when its digits add to a multiple of $9$. In $4\\square 71$ the others add to $12$, so the box holds $6$ to make $18$.'),
            ),
            ask('cm-parity-signs', 2),
            teach(
              prose('A highest common factor comes from prime factors. $1 + 2 + \\cdots + 10$ pairs up from the ends into $5$ pairs of $11$:'),
              maths('5 \\times 11 = 55'),
              prose('$1 \\times 2 \\times \\cdots \\times 10$ holds the $5$ but not the $11$, which is prime and bigger than $10$, so their HCF is $5$.'),
              prose('Sorting $1$ to $30$ by multiples of $2$ and of $3$: $15$ and $10$ of them, with the $5$ multiples of $6$ in both.'),
            ),
            ask('cm-gcd-sum-factorial'),
            ask('cm-venn-multiples'),
            ask('cm-last-digit+choice', 2),
            askAfter(
              'cm-missing-digit',
              2,
              prose('For $11$, give the digits signs $+, -, +, \\ldots$ from the left. $2728$ gives $2 - 7 + 2 - 8 = -11$, a multiple of $11$, so $2728$ is one.'),
            ),
            ask('cm-venn-multiples', 2),
          ],
          skillCheck: [ask('cm-last-digit', 2), ask('cm-gcd-sum-factorial+choice', 2), ask('cm-missing-digit+choice', 2)],
        },
        {
          id: 'cm-l1-creativity',
          title: 'Math Requires Creativity',
          slides: [
            teach(
              prose('Some sums are long only until you regroup them. Pair the terms of an alternating sum:'),
              maths('1 - 2 + 3 - 4 + \\cdots - 10'),
              maths('(1 - 2) + (3 - 4) + \\cdots + (9 - 10)'),
              prose('That is five pairs of $-1$, so $-5$.'),
            ),
            ask('cm-alternating-sum'),
            askAfter(
              'cm-diff-squares',
              1,
              prose('A difference of two squares factorises:'),
              maths('A^2 - B^2 = (A + B)(A - B)'),
              maths('103^2 - 97^2 = 200 \\times 6'),
              maths('= 1200'),
            ),
            askAfter(
              'cm-diff-squares-tiles',
              1,
              prose('Read it backwards. $48$ and $52$ sit $2$ either side of $50$:'),
              maths('48 \\times 52 = 50^2 - 2^2'),
              maths('= 2500 - 4 = 2496'),
            ),
            askAfter('cm-alternating-sum+choice', 2, prose('Counting down, or over odd numbers, the pairs work the same way. Check what each pair is worth, and whether one term is left over.')),
            teach(
              prose('Products can cancel down a whole row at once:'),
              maths('\\left(1 + \\tfrac{1}{2}\\right)\\left(1 + \\tfrac{1}{3}\\right)\\left(1 + \\tfrac{1}{4}\\right)'),
              maths('\\frac{3}{2} \\times \\frac{4}{3} \\times \\frac{5}{4} = \\frac{5}{2}'),
              prose('And when only differences matter, slide every number by the same amount to make one of them $0$. If the mean of $a$ and $b$ is $c$, taking $a = 0$ gives $c = \\tfrac{1}{2} b$.'),
            ),
            ask('cm-telescoping-product'),
            ask('cm-average-chain'),
            ask('cm-diff-squares+choice', 2),
            askAfter(
              'cm-telescoping-product+choice',
              2,
              prose('With minus signs each bottom cancels the next top instead. And $1 - \\tfrac{1}{k^2} = \\tfrac{k - 1}{k} \\times \\tfrac{k + 1}{k}$ splits a row of squares into two rows that each cancel.'),
            ),
            ask('cm-average-chain', 2),
          ],
          skillCheck: [ask('cm-average-chain+choice', 2), ask('cm-diff-squares', 2), ask('cm-telescoping-product', 2)],
        },
      ],
      levelCheck: [
        ask('cm-jar', 2),
        ask('cm-pair-sums', 2),
        ask('cm-close-fractions', 2),
        ask('cm-polygon-sides', 2),
        ask('cm-tilted-square', 2),
        ask('cm-clock-angle+choice', 2),
        ask('cm-handshakes', 2),
        ask('cm-page-digits', 2),
        ask('cm-missing-digit', 2),
        ask('cm-gcd-sum-factorial', 2),
        ask('cm-average-chain', 2),
        ask('cm-alternating-sum', 2),
      ],
    },
    {
      id: 'cm-l2',
      title: 'Equations and Ratios',
      lessons: [
        {
          id: 'cm-l2-ratios-percents',
          title: 'Ratios and Percentages',
          slides: [
            teach(
              prose('A percentage change is a multiplication. A rise of $20\\%$ multiplies by $1.2$, and a cut of $20\\%$ multiplies by $0.8$.'),
              prose('So a rise of $20\\%$ followed by a cut of $20\\%$ does not get back to the start:'),
              maths('1.2 \\times 0.8 = 0.96'),
              prose('The price ends at $96\\%$ of where it began, a change of'),
              maths('96 - 100 = -4'),
              prose('percent. Multiplying works in either order, so the order of the two changes makes no difference.'),
            ),
            ask('cm-percent-chain'),
            askAfter(
              'cm-percent-swap+choice',
              1,
              prose('$x\\%$ of $y$ is $x \\times y \\div 100$, and so is $y\\%$ of $x$. Swap them when that makes it easy:'),
              maths('16\\% \\text{ of } 25 = 25\\% \\text{ of } 16 = 4'),
            ),
            askAfter(
              'cm-reverse-percent',
              1,
              prose('Going back: after a rise of $25\\%$ a coat costs £$150$. The new price is $1.25$ times the old one, so divide:'),
              maths('150 \\div 1.25 = 120'),
              prose('Taking $25\\%$ off $150$ gives $112.50$, which is wrong: the $25\\%$ was of the old price.'),
            ),
            teach(
              prose('Ratios count **parts**. Sam and Tia share sweets $5 : 3$, and Sam gets $10$ more. The difference is $2$ parts:'),
              maths('2 \\text{ parts} = 10'),
              maths('1 \\text{ part} = 5'),
              prose('So Sam has $25$, Tia $15$, and there are $40$ in all.'),
              prose('Two ratios that share a quantity join by making the shared one match. With $a : b = 2 : 3$ and $b : c = 4 : 5$, make $b$ the LCM, $12$:'),
              maths('2 : 3 = 8 : 12'),
              maths('4 : 5 = 12 : 15'),
              maths('a : b : c = 8 : 12 : 15'),
            ),
            ask('cm-ratio-share'),
            ask('cm-ratio-combine'),
            askAfter(
              'cm-reverse-percent+choice',
              2,
              prose('A sale works the same way. In a $30\\%$ off sale the price is $70\\%$ of the old one, so divide by $0.7$.'),
            ),
            ask('cm-percent-chain+choice', 2),
            askAfter('cm-ratio-share', 2, prose('Once one part is known, any share is that many parts.')),
          ],
          skillCheck: [ask('cm-percent-swap', 2), ask('cm-ratio-combine', 2), ask('cm-reverse-percent', 2)],
        },
        {
          id: 'cm-l2-equations',
          title: 'Simple Equations',
          slides: [
            teach(
              prose('Brackets on both sides: multiply out, then collect $x$ on one side and numbers on the other.'),
              maths('4(x - 3) = 2(x + 5) + x'),
              maths('4x - 12 = 2x + 10 + x'),
              maths('4x - 3x = 10 + 12'),
              maths('x = 22'),
            ),
            ask('cm-brackets-equation'),
            askAfter(
              'cm-three-scores',
              1,
              prose('Word problems: name the smallest amount and write the others from it. The second has twice the third, and the first has $10$ more than the second, $100$ in all. With the third as $t$:'),
              maths('t + 2t + (2t + 10) = 100'),
              maths('5t = 90'),
              maths('t = 18'),
              prose('So the second has $36$ and the first $46$.'),
            ),
            ask('cm-three-scores-tiles'),
            askAfter(
              'cm-brackets-equation+choice',
              2,
              prose('When the right has more $x$, the $x$ left over is negative:'),
              maths('3(x - 1) = 2(x + 4) + 2x'),
              maths('3x - 3 = 4x + 8'),
              maths('-x = 11'),
              maths('x = -11'),
            ),
            teach(
              prose('Half a journey at $30$ mph and half at $60$ mph: the halves are the same distance, so the time goes the other way to the speed.'),
              maths('\\text{time}_1 : \\text{time}_2 = 60 : 30 = 2 : 1'),
              prose('A $45$-minute trip splits $30$ and $15$ minutes.'),
              prose('Mixtures: count the one thing that is mixed. Mix $x$ kg of a $10\\%$ nut mix with $20 - x$ kg of a $40\\%$ one to get $20$ kg at $25\\%$:'),
              maths('0.1x + 0.4(20 - x) = 5'),
              maths('10x + 800 - 40x = 500'),
              maths('30x = 300'),
              maths('x = 10'),
            ),
            ask('cm-halfway-speeds'),
            ask('cm-mixture'),
            ask('cm-halfway-speeds+choice', 2),
            ask('cm-mixture+choice', 2),
          ],
          skillCheck: [ask('cm-three-scores', 2), ask('cm-brackets-equation', 2), ask('cm-mixture', 2)],
        },
        {
          id: 'cm-l2-sequences',
          title: 'Sequences and Series',
          slides: [
            teach(
              prose('An arithmetic sequence adds the same step $d$ each time. Two terms give the step: the 3rd term is $7$ and the 8th is $22$, which is $5$ steps on.'),
              maths('22 - 7 = 15'),
              maths('d = 15 \\div 5 = 3'),
              prose('The 20th term is $12$ steps past the 8th:'),
              maths('22 + 12 \\times 3 = 58'),
            ),
            ask('cm-arith-term'),
            ask('cm-sequence-table'),
            askAfter(
              'cm-arith-sum',
              1,
              prose('To add an arithmetic series, count the terms, then pair the first with the last. For $5 + 7 + \\cdots + 25$:'),
              maths('(25 - 5) \\div 2 + 1 = 11'),
              maths('5 + 25 = 30'),
              maths('\\tfrac{1}{2} \\times 11 \\times 30 = 165'),
            ),
            ask('cm-arith-term+choice', 2),
            teach(
              prose('The first $n$ odd numbers add to $n^2$: there are $n$ terms and each pair makes $2n$.'),
              maths('1 + 3 + 5 + 7 = 16 = 4^2'),
              prose('The first $n$ even numbers are each one more, so they add to $n^2 + n$:'),
              maths('2 + 4 + 6 + 8 = 20 = 4^2 + 4'),
              prose('A geometric sequence multiplies instead, so it grows fast and it is quickest to write the terms out. Starting at $3$ and doubling: $3, 6, 12, 24, 48, 96, 192$. The first term past $100$ is the 7th.'),
            ),
            ask('cm-odd-sums'),
            ask('cm-geo-past'),
            askAfter('cm-odd-sums+choice', 2, prose('Evens take away odds: pair $2 - 1$, $4 - 3$ and so on, and each pair is $1$.')),
            ask('cm-arith-sum+choice', 2),
          ],
          skillCheck: [ask('cm-geo-past+choice', 2), ask('cm-sequence-table', 2), ask('cm-odd-sums', 2)],
        },
        {
          id: 'cm-l2-equations-ratios',
          title: 'Equations with Ratios',
          slides: [
            teach(
              prose('When a ratio changes, write the amounts as parts of an unknown $k$. Red to blue is $3 : 1$, and after $10$ more of each it is $2 : 1$:'),
              maths('3k + 10 = 2(k + 10)'),
              maths('3k + 10 = 2k + 20'),
              maths('k = 10'),
              prose('So there were $30$ red at first.'),
            ),
            ask('cm-ratio-change'),
            askAfter(
              'cm-age-ratio',
              1,
              prose('Ages work the same way, and both ages go up by the same number of years. Ana is $4$ times as old as Ben, and in $6$ years she will be $3$ times as old:'),
              maths('4s + 6 = 3(s + 6)'),
              maths('4s + 6 = 3s + 18'),
              maths('s = 12'),
              prose('So Ben is $12$ and Ana is $48$.'),
            ),
            ask('cm-ratio-change+choice', 2),
            teach(
              prose('When only a ratio is given, only the ratio matters, so pick numbers in it. With $x : y = 2 : 5$, take $x = 2$ and $y = 5$:'),
              maths('\\frac{3x + y}{x + y} = \\frac{6 + 5}{2 + 5} = \\frac{11}{7}'),
              prose('Working together, add the **rates**, not the times. Taps that fill a bath in $4$ and $6$ minutes fill, each minute,'),
              maths('\\frac{1}{4} + \\frac{1}{6} = \\frac{5}{12}'),
              prose('of it, so together they take $\\frac{12}{5}$ minutes.'),
            ),
            ask('cm-ratio-expression'),
            ask('cm-work-together'),
            ask('cm-age-ratio+choice', 2),
            askAfter(
              'cm-ratio-combine',
              2,
              prose('Two ratios with a shared quantity: make the shared one match. With $a : b = 3 : 4$ and $b : c = 6 : 5$, make $b = 12$:'),
              maths('a : b : c = 9 : 12 : 10'),
            ),
            ask('cm-work-together+choice', 2),
            ask('cm-ratio-expression+choice', 2),
          ],
          skillCheck: [ask('cm-age-ratio', 2), ask('cm-ratio-expression', 2), ask('cm-work-together', 2)],
        },
        {
          id: 'cm-l2-geometric-ratios',
          title: 'Non-numeric Geometric Ratios',
          slides: [
            teach(
              prose('Scale a shape so every length is $k$ times as long. Areas are two lengths multiplied, so they scale by $k^2$. Volumes are three, so by $k^3$.'),
              prose('Similar triangles with lengths $2 : 3$ have areas $4 : 9$. If the smaller has area $8$, the larger has'),
              maths('8 \\times \\tfrac{9}{4} = 18'),
              prose('Going back, areas $9 : 16$ mean lengths $3 : 4$ and so volumes $27 : 64$.'),
            ),
            ask('cm-scale-factor'),
            ask('cm-scale-tiles'),
            askAfter(
              'cm-scale-factor+choice',
              2,
              prose('Volumes cube the length ratio. Similar cones with lengths $1 : 2$ have volumes $1 : 8$, so a volume of $5$ becomes $40$.'),
            ),
            teach(
              prose('Some areas need no lengths at all.'),
              prose('Join any point on the top of a rectangle to the bottom corners. The triangle has the same base and height, so it is **half** the rectangle. A parallelogram works the same way.'),
              prose('Join the midpoints of a triangle’s sides. The middle triangle has sides half as long, so its area is a **quarter**. Do it twice and it is a sixteenth.'),
              prose('Draw a circle inside a square and a square inside that circle. The inner square’s diagonal is the outer square’s side, so its area is **half**.'),
            ),
            ask('cm-half-rectangle'),
            ask('cm-midpoint-triangles'),
            ask('cm-nested-squares+choice'),
            ask('cm-half-rectangle+choice', 2),
            ask('cm-nested-squares', 2),
          ],
          skillCheck: [ask('cm-midpoint-triangles', 2), ask('cm-scale-tiles', 2), ask('cm-half-rectangle', 2)],
        },
      ],
      levelCheck: [
        ask('cm-percent-chain', 2),
        ask('cm-reverse-percent', 2),
        ask('cm-ratio-combine', 2),
        ask('cm-brackets-equation', 2),
        ask('cm-three-scores', 2),
        ask('cm-halfway-speeds+choice', 2),
        ask('cm-arith-sum', 2),
        ask('cm-odd-sums', 2),
        ask('cm-age-ratio', 2),
        ask('cm-work-together', 2),
        ask('cm-scale-factor', 2),
        ask('cm-nested-squares', 2),
      ],
    },
  ],
};
