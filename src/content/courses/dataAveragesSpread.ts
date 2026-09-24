/**
 * Data, Averages and Spread.
 *
 * Level 1 is averages: the mean, median and mode of a list and which one a
 * question wants, a missing value from a known mean and two groups combined,
 * frequency tables with an `fx` column, grouped data by midpoints with an
 * estimated mean and the modal class, and reading a scatter diagram. Level 2
 * is spread: the range and what one extreme value does to it, quartiles and
 * the interquartile range, outliers by the 1.5 times IQR rule, variance from
 * `\sum x^2 / n - \bar{x}^2`, and the standard deviation, with two sets of
 * data compared by their means and spreads.
 *
 * Sigma notation belongs to Sequences & Series (`sq-l2-sigma`) and
 * rearranging a formula to Linear Equations (`le-l3-subject`); both are
 * pointed at here, not taught again. Quartiles are taught for lists of
 * length 4k + 3 only, where they sit at whole positions, and no other length
 * is ever asked. Later levels are in `docs/roadmap/levels/data-averages-spread.md`.
 *
 * Each level closes with a level check: fifteen questions, no teaching
 * slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import { plotSvg } from '../figures';

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
const display = (tex: string): Block => ({ kind: 'display', tex });

/** Lines of working stacked in one display and aligned on their `&`. */
const working = (...lines: string[]): Block => display(`\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`);

const figure = (options: Parameters<typeof plotSvg>[0]): Block => ({ kind: 'diagram', svg: plotSvg(options) });

/** The scatter window every generated question uses too, so the teaching picture reads the same way. */
const scatter = (points: [number, number][], label: string, line?: (x: number) => number): Block =>
  figure({
    xMin: -0.4,
    xMax: 10.4,
    yMin: -0.4,
    yMax: 10.4,
    height: 200,
    grid: true,
    curves: line ? [{ f: line, accent: true }] : [],
    marks: points.map(([x, y]) => ({ x, y })),
    label,
  });

const risingPoints: [number, number][] = [
  [1, 2],
  [2, 3],
  [3, 3],
  [4, 5],
  [5, 5],
  [6, 7],
  [7, 7],
  [8, 9],
];

export const dataAveragesSpread: Course = {
  id: 'data-averages-spread',
  category: 'statistics',
  // After Probability (10), which opens the tab.
  position: 20,
  title: 'Data, Averages and Spread',
  blurb: 'Summing up a set of data: its averages, frequency tables and scatter diagrams, then its range, quartiles, outliers and standard deviation.',
  levels: [
    {
      id: 'da-l1',
      title: 'Averages and Frequency Tables',
      lessons: [
        {
          id: 'da-l1-averages',
          title: 'Mean, Median and Mode',
          slides: [
            teach(
              prose(
                'An **average** is one number that stands for a whole list. There are three, and each answers a different question. For $3, 7, 4, 7, 9$, which is $3, 4, 7, 7, 9$ in order:',
              ),
              working('\\text{mean} &= \\frac{30}{5} = 6', '\\text{median} &= 7', '\\text{mode} &= 7'),
              prose(
                'The **mean** $\\bar{x}$ is the total shared out equally: $\\bar{x} = \\frac{\\sum x}{n}$, where $\\sum x$ adds every value (the $\\sum$ of Sequences & Series) and $n$ counts them. The **median** is the middle value once the list is in order. The **mode** is the value that turns up most.',
              ),
            ),
            ask('dat-mean'),
            ask('dat-sum-tree'),
            ask('dat-median-mode+choice'),
            teach(
              prose('With an even number of values there is no single middle one. The median is then halfway between the middle two. For $2, 5, 8, 9, 12, 20$:'),
              working('\\text{middle two} &= 8 \\text{ and } 9', '\\text{median} &= \\frac{8 + 9}{2} = 8.5'),
              prose(
                'Always put the list in order first: the middle of a jumbled list means nothing. And a mean does not have to be one of the values, or even a whole number.',
              ),
            ),
            ask('dat-median-mode', 2),
            ask('dat-mean', 2),
            ask('dat-sum-tree', 2),
            teach(
              prose('Which average to use depends on the data and on the question.'),
              prose(
                '**Categories**, such as favourite colours, cannot be added or put in order, so only the mode works. **Numbers with one extreme value**, such as salaries at a firm where the owner earns ten times the rest, want the median: the extreme value drags the mean towards it, while the middle hardly moves. **Otherwise** the mean is best, since it uses every value.',
              ),
              prose('And a shop deciding which shoe size to stock most of wants the mode even though sizes are numbers: the question is after the most common value.'),
            ),
            ask('dat-which-average'),
            ask('dat-which-average', 2),
          ],
          skillCheck: [ask('dat-mean', 2), ask('dat-median-mode', 2), ask('dat-which-average', 2)],
        },
        {
          id: 'da-l1-missing',
          title: 'Missing Values and Combined Means',
          slides: [
            teach(
              prose(
                'The mean formula works backwards too. $\\bar{x} = \\frac{\\text{total}}{n}$ rearranges, as in Changing the Subject, to $\\text{total} = n \\times \\bar{x}$. So a mean and a count tell you the total.',
              ),
              prose('The mean of $4$ values is $9$. Three of them are $6$, $10$ and $12$, which add to $28$. The fourth is $x$:'),
              working('\\text{total} &= 4 \\times 9 = 36', 'x &= 36 - 28 = 8'),
            ),
            ask('dat-total-tiles'),
            ask('dat-missing'),
            ask('dat-missing', 2),
            teach(
              prose('The same idea gives the new mean when a value joins the list or leaves it. The mean of $5$ values is $8$, and the value $14$ is added:'),
              working('\\text{old total} &= 5 \\times 8 = 40', '\\text{new total} &= 40 + 14 = 54', '\\bar{x} &= \\frac{54}{6} = 9'),
              prose('Taking a value out works the same way: subtract it from the total, and divide by one fewer.'),
            ),
            ask('dat-add-value-steps'),
            ask('dat-total-tiles', 2),
            ask('dat-add-value-steps', 2),
            teach(
              prose(
                'Two groups combine the same way. $10$ pupils have a mean of $6$, a total of $60$, and $30$ pupils have a mean of $10$, a total of $300$:',
              ),
              working('\\text{total} &= 60 + 300 = 360', '\\bar{x} &= \\frac{360}{40} = 9'),
              prose(
                'Not $\\frac{6 + 10}{2} = 8$: averaging the two means pretends the groups are the same size. The bigger group pulls the combined mean towards its own.',
              ),
            ),
            ask('dat-combined-tree'),
            ask('dat-combined-tree', 2),
          ],
          skillCheck: [ask('dat-missing', 2), ask('dat-add-value-steps', 2), ask('dat-combined-tree', 2)],
        },
        {
          id: 'da-l1-frequency',
          title: 'Frequency Tables',
          slides: [
            teach(
              prose('A **frequency table** says how often each value happened. Goals scored in $20$ matches:'),
              display('\\begin{array}{c|cccc} x & 0 & 1 & 2 & 3 \\\\ \\hline f & 4 & 7 & 6 & 3 \\end{array}'),
              prose(
                'Four matches with $0$ goals, seven with $1$, and so on. To add all the goals, multiply each value by its frequency: the $fx$ column. Then $\\sum f$ counts the matches and $\\sum fx$ totals the goals.',
              ),
              working('\\sum fx &= 0 + 7 + 12 + 9 = 28', '\\bar{x} &= \\frac{\\sum fx}{\\sum f} = \\frac{28}{20} = 1.4'),
            ),
            ask('dat-fx-table'),
            ask('dat-freq-formula-tiles'),
            ask('dat-freq-mean'),
            teach(
              prose(
                'The **mode** of a table is the value with the biggest frequency. In the goals table that is $1$, which happened $7$ times.',
              ),
              prose('The mode is $1$, not $7$: the frequency says how often, the value is what happened. Mixing them up is the commonest slip with a table.'),
            ),
            ask('dat-freq-choice'),
            ask('dat-fx-table', 2),
            ask('dat-freq-mean', 2),
            teach(
              prose(
                'For the **median**, count through the frequencies. With $21$ values the median is the $11$th. For this table of scores:',
              ),
              display('\\begin{array}{c|ccccc} x & 1 & 2 & 3 & 4 & 5 \\\\ \\hline f & 3 & 5 & 2 & 8 & 3 \\end{array}'),
              prose(
                'Running totals are $3$, $8$, $10$, $18$, $21$. The $11$th value is past the $10$th, so it is among the fours: the median is $4$. Not $3$, the middle of the top row.',
              ),
            ),
            ask('dat-freq-choice', 2),
            ask('dat-freq-formula-tiles', 2),
          ],
          skillCheck: [ask('dat-fx-table', 2), ask('dat-freq-mean', 2), ask('dat-freq-choice', 2)],
        },
        {
          id: 'da-l1-grouped',
          title: 'Grouped Data',
          slides: [
            teach(
              prose(
                'When values are spread over a wide range they are grouped into **classes**. $10 \\le x < 20$ holds every value from $10$ up to, but not including, $20$.',
              ),
              display('\\begin{array}{c|c} \\text{Class} & f \\\\ \\hline 0 \\le x < 10 & 3 \\\\ 10 \\le x < 20 & 9 \\\\ 20 \\le x < 30 & 6 \\end{array}'),
              prose(
                'Each class has a **midpoint**, halfway between its ends: $5$, $15$ and $25$ here. The **modal class** is the one with the biggest frequency, $10 \\le x < 20$.',
              ),
            ),
            ask('dat-midpoint-table'),
            ask('dat-modal-class'),
            ask('dat-midpoint-table', 2),
            teach(
              prose(
                'The exact values are lost once they are grouped, so the mean can only be **estimated**. Take every value in a class to sit at its midpoint, and use the midpoints as the $x$ in $\\frac{\\sum fx}{\\sum f}$:',
              ),
              prose('The $fx$ column is $5 \\times 3 = 15$, $15 \\times 9 = 135$ and $25 \\times 6 = 150$:'),
              working('\\sum fx &= 15 + 135 + 150', '&= 300', '\\bar{x} &\\approx \\frac{300}{18} \\approx 16.7'),
              prose('It is an estimate because the values in a class are rarely spread evenly around its middle.'),
            ),
            ask('dat-grouped-steps'),
            ask('dat-grouped-mean'),
            ask('dat-grouped-steps', 2),
            teach(
              prose(
                'The class that holds the median is found the same way as with a frequency table: add up the frequencies as you go until you pass the middle position.',
              ),
              prose(
                'With $3$, $9$ and $6$ there are $18$ values, and the running totals are $3$, $12$, $18$. The middle of $18$ values is between the $9$th and $10$th, and both are in $10 \\le x < 20$.',
              ),
            ),
            ask('dat-modal-class', 2),
            ask('dat-grouped-mean', 2),
          ],
          skillCheck: [ask('dat-grouped-mean', 2), ask('dat-modal-class', 2), ask('dat-grouped-steps', 2)],
        },
        {
          id: 'da-l1-scatter',
          title: 'Scatter Diagrams',
          slides: [
            teach(
              prose(
                'A **scatter diagram** plots two measurements of each thing, one across and one up: hours revised against marks, say. Each square on these grids is one unit.',
              ),
              scatter(risingPoints, 'Eight points rising from bottom left to top right, close to a straight line'),
              prose(
                'These points rise from left to right: **positive correlation**. Points falling from left to right show **negative correlation**, and a shapeless cloud shows **no correlation**. The closer the points sit to a straight line, the **stronger** the correlation. A point far from the pattern of the rest is an **outlier**.',
              ),
            ),
            ask('dat-correlation'),
            ask('dat-scatter-slider'),
            ask('dat-correlation', 2),
            teach(
              prose('A **line of best fit** runs through the middle of the points, following their trend. Its equation turns one measurement into an estimate of the other.'),
              scatter(risingPoints, 'The same eight points with the line y = 1 + x drawn through them', (x) => 1 + x),
              prose('This line is $y = 1 + x$, so at $x = 4.5$ it estimates $y = 1 + 4.5 = 5.5$.'),
            ),
            ask('dat-line-estimate'),
            ask('dat-scatter-slider', 2),
            ask('dat-line-estimate', 2),
            teach(
              prose(
                'An estimate inside the range of the data is **interpolation**, and it is as reliable as the correlation is strong. An estimate outside it is **extrapolation**: nothing says the pattern carries on, so it is unreliable however good the fit.',
              ),
              prose('And correlation is not cause. Ice cream sales and sunburn rise together, but one does not cause the other: hot weather causes both.'),
            ),
            ask('dat-reliable-flow'),
            ask('dat-reliable-flow', 2),
          ],
          skillCheck: [ask('dat-correlation', 2), ask('dat-line-estimate', 2), ask('dat-reliable-flow', 2)],
        },
      ],
      levelCheck: [
        ask('dat-mean', 2),
        ask('dat-median-mode', 2),
        ask('dat-which-average', 2),
        ask('dat-total-tiles', 2),
        ask('dat-missing', 2),
        ask('dat-combined-tree', 2),
        ask('dat-add-value-steps', 2),
        ask('dat-fx-table', 2),
        ask('dat-freq-mean', 2),
        ask('dat-freq-choice', 2),
        ask('dat-grouped-mean', 2),
        ask('dat-modal-class', 2),
        ask('dat-correlation', 2),
        ask('dat-line-estimate', 2),
        ask('dat-reliable-flow', 2),
      ],
    },
    {
      id: 'da-l2',
      title: 'Measures of Spread',
      lessons: [
        {
          id: 'da-l2-range',
          title: 'The Range',
          slides: [
            teach(
              prose(
                'Two lists can share an average and still look nothing alike: $5, 5, 5$ and $1, 5, 9$ both have a mean of $5$. A **measure of spread** says how far the values stray.',
              ),
              prose('The simplest is the **range**: the largest value take the smallest.'),
              prose('For $1, 5, 9$ the range is $9 - 1 = 8$. For $-4, 2, 7$, take care with the sign:'),
              display('7 - (-4) = 11'),
              prose('Find the largest and smallest by looking through the whole list, not by reading its two ends.'),
            ),
            ask('dat-range'),
            ask('dat-range-tiles'),
            ask('dat-range', 2),
            teach(
              prose('The range uses only two values, so one extreme value decides it. Marks of $12, 14, 15, 15, 17, 95$:'),
              working('\\text{with } 95 &= 95 - 12 = 83', '\\text{without} &= 17 - 12 = 5'),
              prose('One mark of $95$, perhaps a typing error, makes the spread look sixteen times bigger than it is.'),
            ),
            ask('dat-remove-choice'),
            ask('dat-range-flow'),
            ask('dat-range-tiles', 2),
            teach(
              prose('So which values change the range when they are taken out? Only an end, the largest or the smallest.'),
              prose(
                'And only an end that is alone. In $3, 8, 9, 9$ taking out one $9$ leaves the other, so the range is still $9 - 3 = 6$. Taking out the $3$ makes it $9 - 8 = 1$.',
              ),
            ),
            ask('dat-range-flow', 2),
            ask('dat-remove-choice', 2),
          ],
          skillCheck: [ask('dat-range', 2), ask('dat-remove-choice', 2), ask('dat-range-flow', 2)],
        },
        {
          id: 'da-l2-quartiles',
          title: 'Quartiles and the IQR',
          slides: [
            teach(
              prose(
                'The median cuts an ordered list in half. The **quartiles** cut it into quarters: the **lower quartile** $Q_1$ a quarter of the way along, the median $Q_2$, and the **upper quartile** $Q_3$ three quarters along.',
              ),
              prose(
                'Every list in this course has $n = 4k + 3$ values ($7$, $11$, $15$, ...), which puts the quartiles at whole positions: $\\frac{n + 1}{4}$, then twice and three times that. For $11$ values, $\\frac{12}{4} = 3$:',
              ),
              working('Q_1 &= \\text{3rd value}', 'Q_2 &= \\text{6th value}', 'Q_3 &= \\text{9th value}'),
            ),
            ask('dat-quartile-choice'),
            ask('dat-quartile-table'),
            ask('dat-quartile-choice', 2),
            teach(
              prose('The **interquartile range** is the distance between the quartiles: the spread of the middle half of the data.'),
              display('\\text{IQR} = Q_3 - Q_1'),
              prose('For $2, 4, 5, 7, 8, 10, 30$ the quartiles are the 2nd and 6th values, $4$ and $10$, so the IQR is $6$.'),
            ),
            ask('dat-quartiles-tree'),
            ask('dat-iqr'),
            ask('dat-quartile-table', 2),
            teach(
              prose(
                'In that list the range is $30 - 2 = 28$, but the IQR is only $6$: the IQR leaves out the top and bottom quarters, so one extreme value cannot move it much. That is why it is the spread to use alongside a median.',
              ),
              prose('As with the median, put a jumbled list in order before counting along it.'),
            ),
            ask('dat-iqr', 2),
            ask('dat-quartiles-tree', 2),
          ],
          skillCheck: [ask('dat-quartile-table', 2), ask('dat-iqr', 2), ask('dat-quartiles-tree', 2)],
        },
        {
          id: 'da-l2-outliers',
          title: 'Outliers',
          slides: [
            teach(
              prose(
                'How far is too far? A common rule: a value is an **outlier** if it is more than $1.5 \\times \\text{IQR}$ beyond a quartile. The two **fences** are',
              ),
              working('\\text{lower} &= Q_1 - 1.5 \\times \\text{IQR}', '\\text{upper} &= Q_3 + 1.5 \\times \\text{IQR}'),
              prose('With $Q_1 = 20$ and $Q_3 = 28$ the IQR is $8$ and $1.5 \\times 8 = 12$, so the fences are $8$ and $40$. A value of $43$ is an outlier; $39$ is not.'),
            ),
            ask('dat-fence-steps'),
            ask('dat-fence-tiles'),
            ask('dat-outlier-flow'),
            teach(
              prose('An odd IQR puts the fences on a half. With $Q_1 = 11$ and $Q_3 = 16$:'),
              working('\\text{IQR} &= 5, \\quad 1.5 \\times 5 = 7.5', '\\text{fences} &= 3.5 \\text{ and } 23.5'),
              prose('The lower fence can even be negative. That only means no value can be too small.'),
            ),
            ask('dat-fence-steps', 2),
            ask('dat-outlier-count'),
            ask('dat-fence-tiles', 2),
            teach(
              prose(
                'To check a whole list: put it in order, find $Q_1$ and $Q_3$, work out both fences, then look at the values beyond them.',
              ),
              prose(
                'An outlier is a question, not a verdict. It may be a mistake, worth removing, or a genuine extreme, worth keeping and mentioning.',
              ),
            ),
            ask('dat-outlier-flow', 2),
            ask('dat-outlier-count', 2),
          ],
          skillCheck: [ask('dat-fence-steps', 2), ask('dat-outlier-count', 2), ask('dat-outlier-flow', 2)],
        },
        {
          id: 'da-l2-variance',
          title: 'Variance',
          slides: [
            teach(
              prose(
                'The range and the IQR use two values each. The **variance** uses them all: it is the mean of the squares take the square of the mean.',
              ),
              display('\\sigma^2 = \\frac{\\sum x^2}{n} - \\bar{x}^2'),
              prose(
                '$\\sum x^2$ squares every value and then adds. It is not $(\\sum x)^2$, which adds first and squares the total. For $1, 2, 3$: $\\sum x^2 = 1 + 4 + 9 = 14$, but $(\\sum x)^2 = 36$.',
              ),
            ),
            ask('dat-x2-table'),
            ask('dat-var-tree'),
            ask('dat-var-formula-steps'),
            teach(
              prose('For $2, 4, 6, 8$:'),
              working('\\bar{x} &= 20 \\div 4 = 5', '\\sum x^2 &= 4 + 16 + 36 + 64', '&= 120', '\\sigma^2 &= 120 \\div 4 - 5^2', '&= 30 - 25 = 5'),
              prose('A variance of $0$ would mean every value is the same. The more the values stray from the mean, the bigger it gets.'),
            ),
            ask('dat-variance'),
            ask('dat-x2-table', 2),
            ask('dat-var-tree', 2),
            teach(
              prose(
                'From a list, work out $\\sum x$ and $\\sum x^2$ first, then use the formula. A negative value squares to a positive, so $\\sum x^2$ is never negative, and nor is the variance.',
              ),
              prose('A variance that comes out negative always means a slip: most often $(\\sum x)^2$ was used where $\\bar{x}^2$ belongs.'),
            ),
            ask('dat-var-formula-steps', 2),
            ask('dat-variance', 2),
          ],
          skillCheck: [ask('dat-var-tree', 2), ask('dat-variance', 2), ask('dat-var-formula-steps', 2)],
        },
        {
          id: 'da-l2-sd',
          title: 'Standard Deviation and Comparing',
          slides: [
            teach(
              prose(
                'The variance is in squared units: marks squared, seconds squared. Its square root, the **standard deviation** $\\sigma$, is back in the units of the data, which makes it the spread people quote.',
              ),
              display('\\sigma = \\sqrt{\\frac{\\sum x^2}{n} - \\bar{x}^2}'),
              prose('For $2, 4, 6, 8$ the variance was $5$, so $\\sigma = \\sqrt{5} \\approx 2.24$. The root key is on the keypad when you need it.'),
            ),
            ask('dat-sd'),
            ask('dat-sd-tiles'),
            ask('dat-sd', 2),
            teach(
              prose(
                'To compare two sets of data, compare one average and one spread. The mean says which is higher **on average**; the standard deviation says which is more **consistent**, since a smaller one means values closer to their mean.',
              ),
              display('\\begin{array}{l|c|c} & \\text{Mean} & \\text{SD} \\\\ \\hline \\text{Class A} & 64 & 5 \\\\ \\text{Class B} & 58 & 11 \\end{array}'),
              prose('Class A scored higher on average and more consistently.'),
            ),
            ask('dat-compare-choice'),
            ask('dat-compare-flow'),
            ask('dat-sd-tiles', 2),
            teach(
              prose(
                'Two traps. First, higher is not always better: for lap times or faulty parts, the lower mean is the better one. Second, check whether a spread is a variance or a standard deviation before comparing. A variance of $16$ is a standard deviation of $4$, smaller than a standard deviation of $5$.',
              ),
            ),
            ask('dat-compare-choice', 2),
            ask('dat-compare-flow', 2),
          ],
          skillCheck: [ask('dat-sd', 2), ask('dat-compare-choice', 2), ask('dat-compare-flow', 2)],
        },
      ],
      levelCheck: [
        ask('dat-range', 2),
        ask('dat-remove-choice', 2),
        ask('dat-range-flow', 2),
        ask('dat-quartile-table', 2),
        ask('dat-iqr', 2),
        ask('dat-quartile-choice', 2),
        ask('dat-fence-steps', 2),
        ask('dat-outlier-count', 2),
        ask('dat-outlier-flow', 2),
        ask('dat-x2-table', 2),
        ask('dat-var-tree', 2),
        ask('dat-variance', 2),
        ask('dat-sd', 2),
        ask('dat-sd-tiles', 2),
        ask('dat-compare-flow', 2),
      ],
    },
  ],
};
