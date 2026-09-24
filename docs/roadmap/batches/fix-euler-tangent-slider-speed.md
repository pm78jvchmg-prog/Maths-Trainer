# fix-euler-tangent-slider-speed: The Euler tangent slider is slow to draw

Status: done
Branch: `claude/fix-euler-tangent-slider-speed-y6zocm`

`numer-euler-tangent-slider` was about seven times slower per draw than the other Euler generators, so its "can ask more distinct questions than a lesson has slides" check crossed vitest's 5 s limit under full-suite load. Sampling was cheap; the cost was `render` drawing the solution curve through `solutionCurve`, which re-runs forty Runge-Kutta steps from x_0 for every point, and the figure asks for about 360 points. A new `windowCurve`, used only by this generator, marches the curve once across the plotted window (one RK4 step per plot sample gap, anchored on x_0) and reads points off that table. `solutionCurve` and its other caller are unchanged.

Across 400 draws the prompt, answer, slider range and every other field are identical; only the SVG path differs, at 38 of about 129,000 coordinates in 14 draws, each by 0.1 px of rounding. The new curve is the more accurate one (worst error 3e-7 against 2.5e-5 before, checked against a 4,000-step march).

Alone, before and after: the seed-looping tests 0.75 to 1.37 s each, now 0.10 to 0.41 s; "can ask more distinct questions" 2.43 s, now 0.36 s. No test, seed, check or time limit changed.
