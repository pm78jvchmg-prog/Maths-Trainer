# Data, Averages and Spread: level plan

Written by C17.

Has: Averages and Frequency Tables (mean, median and mode and which one a
question wants, a missing value from a known mean and two groups combined,
frequency tables with an fx column, grouped data by midpoints with an
estimated mean and the modal class, reading a scatter diagram and a line of
best fit); Measures of Spread (the range and what one extreme value does to
it, quartiles and the IQR for lists of length 4k + 3, outliers by the
1.5 times IQR rule, variance from the sum of squares, the standard deviation
and comparing two sets by mean and spread); Cumulative Frequency (running
totals down a grouped table and back, the curve through the upper class
boundaries from zero at the lowest, readings below, above and between
values, the median and quartiles at n/4, n/2 and 3n/4 rather than the list
rule, percentiles at pn/100 and the 10th to 90th range, and the same
readings by interpolating inside a class; C17-l4).

Cumulative Frequency has no widget of its own: the curve is a file-local
`cumulativeSvg` on plotSvg with a scale laid over it, read by slider, and
the points are joined with straight lines so a reading equals the
interpolation. If a tappable curve widget (tap to plot points, drag a
read-off line) ever exists, the lessons to move onto it are The Cumulative
Frequency Curve (`dat-cf-check` would become plotting the points,
`dat-cf-below-slider` a read-off), Median and Quartiles from the Curve
(`dat-cf-quartile-slider`) and Percentiles (`dat-pct-slider`).

Needs: Representing Data (box plots, histograms with frequency density,
stem-and-leaf diagrams; once the box and histogram plot widgets exist);
Coding Data (how adding and multiplying every value moves the mean and the
standard deviation, and the variance from coded sums); Correlation and Regression
(the product moment correlation coefficient, the least-squares line of y on
x, and which variable to predict from); Grouped Variance and Skew (the
standard deviation from a frequency or grouped table, and skew read from
the mean, median and quartiles).
