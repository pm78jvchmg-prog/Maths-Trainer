# Kinematics: level plan

Written by C20.

Has: Motion Graphs (displacement against distance and velocity against speed
along a line, average speed and velocity, the gradient of a displacement-time
graph as velocity, the gradient of a velocity-time graph as acceleration, the
area under one as distance and displacement); Constant Acceleration (v = u + at
and s = ut + ½at², v² = u² + 2as and s = ½(u + v)t, choosing the equation with
a sign convention, vertical motion under gravity with g = 9.8, two-stage
journeys and one particle catching another); Calculus in Kinematics (v = ds/dt
and a = dv/dt for polynomial s(t), speeding up from the signs of v and a,
exponential motion s = B + Ae^{kt} with v = k(s - B), v and s back again by
integrating with a known value fixing the constant, and the displacement and
distance over an interval where v keeps one sign; no generator declares
`source`, since the oracle differentiates in x, and only the definite
integrals declare `integrand`, always with `limits`, so `kinematics.test.ts`
checks every derivative in t with mathjs instead); Variable Acceleration
(maximum speed and when a particle is at rest or turns round, distance against
displacement when v changes sign inside an interval, reading curved motion
graphs, and chaining from s, v or a with a starting value).

Needs: Projectiles (horizontal and
vertical motion taken separately, time of flight, range and greatest height,
the angle of projection, the path as a quadratic in x); Vectors in Kinematics
(position, velocity and acceleration as i, j vectors, r = r0 + vt, constant
acceleration in two dimensions, when two particles meet or are closest; after
C21 Forces is under way, since it shares the diagrams); Relative Motion and
Harder Problems (overtaking with a head start and a delay, meeting on a return
journey, several stages with a sketch of the velocity-time graph first).
