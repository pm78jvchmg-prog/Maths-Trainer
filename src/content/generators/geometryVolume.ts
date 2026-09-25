/**
 * Geometry, level 8: Volume.
 *
 * Cuboids and prisms (the cross-section times the length), cylinders in terms
 * of $\pi$, how volume scales by the cube of the length factor, and pyramids,
 * cones and spheres from formulas given on the page. Figures come from
 * `geometrySolids.ts`.
 */
import type { Generator, Slide } from '../types';
import { num, numberBank, numberOptions, say, typed } from './contestMath';
import { PI_KEYS, piAns, piOptions, piTex } from './geometryLengths';
import { cm, cm2, coneSvg, cuboidSvg, cylinderSvg, prismSvg, pyramidSvg, sphereSvg } from './geometrySolids';

const diagram = (svg: string) => ({ kind: 'diagram' as const, svg });
/** Cubic centimetres in TeX, kept on one line with the number. */
const cm3 = (v: number) => `${num(v)}\\text{ cm}^3`;

type Rng = Parameters<Generator<unknown>['sample']>[0];

/** A typed answer in terms of π. */
function piTyped(prompt: ReturnType<typeof say | typeof diagram>[], k: number): Slide {
  return { kind: 'expression', prompt, lead: 'V =', keypad: PI_KEYS, answer: piAns(k), domain: 'real', mode: 'exact' };
}

/* ================================================================
 * Lesson 1: Volume
 * ================================================================ */

interface CuboidVolParams {
  l: number;
  w: number;
  h: number;
  /** Which edge is unknown, or none. */
  find: 'V' | 'l' | 'w' | 'h';
}

const geoCuboidVol: Generator<CuboidVolParams> = {
  id: 'geo-cuboid-vol',
  sample(rng, difficulty) {
    for (;;) {
      const l = rng.int(2, 12);
      const w = rng.int(2, 8);
      const h = rng.int(2, 10);
      if (new Set([l, w, h]).size < 3) continue;
      return { l, w, h, find: difficulty >= 2 ? rng.pick(['l', 'w', 'h'] as const) : 'V' };
    }
  },
  render(p) {
    const V = p.l * p.w * p.h;
    const lab = (k: 'l' | 'w' | 'h') => (p.find === k ? 'x' : cm(p[k]));
    const figure = diagram(cuboidSvg(p.l, p.w, p.h, { l: lab('l'), w: lab('w'), h: lab('h') }));
    if (p.find === 'V') return typed([figure, say('Find the volume of the cuboid, in\u00a0cm³.')], V, 'V =');
    return typed([figure, say(`The cuboid has a volume of $${cm3(V)}.$ Find $x$, in\u00a0cm.`)], p[p.find], 'x =');
  },
  choices(p) {
    const V = p.l * p.w * p.h;
    if (p.find === 'V') return numberOptions(V, [2 * (p.l * p.w + p.l * p.h + p.w * p.h), p.l + p.w + p.h, p.l * p.w], 1, 1);
    const ans = p[p.find];
    return numberOptions(ans, [V / ans / 2, ans * 2, ans + 1].filter(Number.isInteger), 1, 1);
  },
  solution(p) {
    const V = p.l * p.w * p.h;
    if (p.find === 'V') return [{ text: 'Length times width times height:' }, { tex: `V = ${p.l} \\times ${p.w} \\times ${p.h} = ${V}` }];
    const known = (['l', 'w', 'h'] as const).filter((k) => k !== p.find).map((k) => p[k]);
    return [{ text: 'Multiply the two edges you know, then divide the volume by that:' }, { tex: `${known[0]} \\times ${known[1]} = ${known[0] * known[1]}` }, { tex: `x = ${V} \\div ${known[0] * known[1]} = ${p[p.find]}` }];
  },
};

interface PrismVolParams {
  a: number;
  b: number;
  L: number;
  /** Find the length from the volume and a given end area (harder). */
  back: boolean;
}

const endArea = ({ a, b }: PrismVolParams) => (a * b) / 2;

function samplePrismVol(rng: Rng, back: boolean): PrismVolParams {
  for (;;) {
    const a = rng.int(2, 12);
    const b = rng.int(2, 10);
    if (a === b || (a * b) % 2) continue;
    return { a, b, L: rng.int(3, 20), back };
  }
}

const geoPrismVol: Generator<PrismVolParams> = {
  id: 'geo-prism-vol',
  sample(rng, difficulty) {
    return samplePrismVol(rng, difficulty >= 2);
  },
  render(p) {
    const A = endArea(p);
    if (p.back) {
      return typed(
        [diagram(prismSvg(p.a, p.b, p.L, { area: `${num(A)} cm²`, L: 'x' })), say(`The end of this prism has an area of $${cm2(A)},$ and its volume is $${cm3(A * p.L)}.$ Find its length $x$, in\u00a0cm.`)],
        p.L,
        'x =',
      );
    }
    return typed([diagram(prismSvg(p.a, p.b, p.L, { a: cm(p.a), b: cm(p.b), L: cm(p.L) })), say('The ends are right-angled triangles. Find the volume of the prism, in\u00a0cm³.')], A * p.L, 'V =');
  },
  choices(p) {
    const A = endArea(p);
    if (p.back) return numberOptions(p.L, [A * p.L - A, p.L * 2, p.L + 1], 1, 1);
    return numberOptions(A * p.L, [p.a * p.b * p.L, A + p.L, (p.a + p.b) * p.L], 1, 1);
  },
  solution(p) {
    const A = endArea(p);
    if (p.back) return [{ text: 'Volume is the end area times the length, so divide:' }, { tex: `x = ${A * p.L} \\div ${A} = ${p.L}` }];
    return [{ text: 'The end is a triangle:' }, { tex: `\\tfrac{1}{2} \\times ${p.a} \\times ${p.b} = ${A}` }, { text: 'Times the length:' }, { tex: `V = ${A} \\times ${p.L} = ${A * p.L}` }];
  },
};

const geoPrismVolTree: Generator<PrismVolParams> = {
  id: 'geo-prismvol-tree',
  sample(rng, difficulty) {
    for (;;) {
      const p = samplePrismVol(rng, false);
      if (difficulty >= 2 && p.L < 10) continue;
      if (new Set([p.a * p.b, endArea(p), endArea(p) * p.L]).size === 3) return p;
    }
  },
  render(p): Slide {
    const A = endArea(p);
    const answers = [p.a * p.b, A, A * p.L];
    return {
      kind: 'tree',
      prompt: [diagram(prismSvg(p.a, p.b, p.L, { a: cm(p.a), b: cm(p.b), L: cm(p.L) })), say('The ends are right-angled triangles. Work out the volume in\u00a0cm³: the two shorter sides multiplied, half of that for the end, then times the length.')],
      expression: `\\tfrac{1}{2} \\times ${p.a} \\times ${p.b} \\times ${p.L}`,
      nodes: [
        { id: 'product', from: [] },
        { id: 'end', from: ['product'] },
        { id: 'volume', from: ['end'] },
      ],
      bank: numberBank(answers, [p.a * p.b * p.L, A + p.L, 2 * p.a * p.b], 3, 1, 1),
      answer: answers.map(num),
    };
  },
  solution(p) {
    const A = endArea(p);
    return [{ tex: `${p.a} \\times ${p.b} = ${p.a * p.b}` }, { tex: `${p.a * p.b} \\div 2 = ${A}` }, { tex: `${A} \\times ${p.L} = ${A * p.L}` }];
  },
};

/* ================================================================
 * Lesson 2: Cylinders and Scaling
 * ================================================================ */

interface CylVolParams {
  r: number;
  h: number;
  given: 'r' | 'd';
}

function sampleCylVol(rng: Rng, difficulty: number): CylVolParams {
  for (;;) {
    const r = rng.int(1, 10);
    const h = rng.int(2, 15);
    if (h > 5 * r || 2 * r > 4 * h || r === h) continue;
    return { r, h, given: difficulty >= 2 ? 'd' : 'r' };
  }
}

const cylFig = ({ r, h, given }: CylVolParams) => diagram(cylinderSvg(r, h, given === 'r' ? { radius: cm(r), height: cm(h) } : { diameter: cm(2 * r), height: cm(h) }));

const cylSteps = ({ r, h, given }: CylVolParams) => [
  ...(given === 'd' ? [{ text: 'Halve the diameter for the radius:' }, { tex: `r = ${2 * r} \\div 2 = ${r}` }] : []),
  { text: 'The circle, times the height:' },
  { tex: `\\pi \\times ${r}^2 = ${piTex(r * r)}` },
  { tex: `V = ${piTex(r * r)} \\times ${h} = ${piTex(r * r * h)}` },
];

const geoCylinderVol: Generator<CylVolParams> = {
  id: 'geo-cylinder-vol',
  sample: sampleCylVol,
  render(p) {
    return piTyped([cylFig(p), say('Find the volume of the cylinder in\u00a0cm³. Leave $\\pi$ in the answer.')], p.r * p.r * p.h);
  },
  choices({ r, h }) {
    return piOptions(r * r * h, [2 * r * h, r * h, 4 * r * r * h]);
  },
  solution: cylSteps,
};

const geoCylinderTiles: Generator<CylVolParams> = {
  id: 'geo-cylinder-tiles',
  sample(rng, difficulty) {
    for (;;) {
      const p = sampleCylVol(rng, difficulty);
      if (p.r * p.r !== p.r * p.r * p.h && p.r > 1) return p;
    }
  },
  render(p): Slide {
    const answers = [p.r * p.r, p.r * p.r * p.h];
    return {
      kind: 'tiles',
      prompt: [cylFig(p), say('Find $r^2$, then the volume in\u00a0cm³.')],
      template: 'r^2 = {0} \\qquad V = {1}\\pi',
      bank: numberBank(answers, [2 * p.r, 2 * p.r * p.h, p.r * p.h, 4 * p.r * p.r].filter((v) => v !== p.r * p.r), 3, 1, 1),
      answer: answers.map(num),
    };
  },
  solution: cylSteps,
};

interface VolFactorParams {
  k: number;
  solids: string;
  kind: 'forward' | 'back' | 'similar';
  /** The smaller solid's volume, for the similar-solids question. */
  V: number;
}

const geoVolFactor: Generator<VolFactorParams> = {
  id: 'geo-vol-factor',
  sample(rng, difficulty) {
    const k = rng.int(2, difficulty >= 2 ? 6 : 10);
    const solids = rng.pick(['cubes', 'cylinders', 'cones', 'prisms', 'pyramids']);
    if (difficulty < 2) return { k, solids, kind: 'forward', V: 0 };
    return { k, solids, kind: rng.pick(['back', 'similar'] as const), V: rng.int(2, 20) };
  },
  render({ k, solids, kind, V }) {
    if (kind === 'forward') return typed([say(`Two ${solids} are similar, with a length scale factor of $${k}.$ What is the volume scale factor?`)], k ** 3, '\\text{volume factor} =');
    if (kind === 'back') return typed([say(`Two ${solids} are similar, and the volume of one is $${k ** 3}$ times the volume of the other. What is the length scale factor?`)], k, 'k =');
    return typed([say(`Two similar ${solids}. The first has a volume of $${cm3(V)},$ and the second is $${k}$ times as long in every direction. Find the volume of the second, in\u00a0cm³.`)], V * k ** 3, 'V =');
  },
  choices({ k, kind, V }) {
    if (kind === 'forward') return numberOptions(k ** 3, [k * k, 3 * k, k], 1, 1);
    if (kind === 'back') return numberOptions(k, [k * k, (k ** 3) / 3, k + 1].filter(Number.isInteger), 1, 1);
    return numberOptions(V * k ** 3, [V * k * k, V * k, V * 3 * k], 1, 1);
  },
  solution({ k, kind, V }) {
    if (kind === 'forward') return [{ text: 'Volume is length times length times length, so the volume factor is the length factor cubed:' }, { tex: `${k}^3 = ${k ** 3}` }];
    if (kind === 'back') return [{ text: 'Take the cube root of the volume factor:' }, { tex: `k = \\sqrt[3]{${k ** 3}} = ${k}` }];
    return [{ text: 'Volumes scale by the length factor cubed:' }, { tex: `${k}^3 = ${k ** 3}` }, { tex: `${V} \\times ${k ** 3} = ${V * k ** 3}` }];
  },
};

/* ================================================================
 * Lesson 3: Pyramids, Cones and Spheres
 * ================================================================ */

interface PyrVolParams {
  s: number;
  h: number;
  back: boolean;
}

const geoPyramidVol: Generator<PyrVolParams> = {
  id: 'geo-pyramid-vol',
  sample(rng, difficulty) {
    for (;;) {
      const s = rng.int(2, 12);
      const h = rng.int(3, 15);
      if ((s * s * h) % 3 || s === h) continue;
      return { s, h, back: difficulty >= 2 };
    }
  },
  render({ s, h, back }) {
    const V = (s * s * h) / 3;
    if (back) return typed([diagram(pyramidSvg(s, h, { s: cm(s), height: 'x' })), say(`The square-based pyramid has a volume of $${cm3(V)}.$ Find its height $x$, in\u00a0cm.`)], h, 'x =');
    return typed([diagram(pyramidSvg(s, h, { s: cm(s), height: cm(h) })), say('Find the volume of the square-based pyramid, in\u00a0cm³.')], V, 'V =');
  },
  choices({ s, h, back }) {
    const V = (s * s * h) / 3;
    if (back) return numberOptions(h, [V / (s * s), h * 3, h + 1].filter(Number.isInteger), 1, 1);
    return numberOptions(V, [s * s * h, V / 2, 2 * V].filter(Number.isInteger), 1, 1);
  },
  solution({ s, h, back }) {
    const V = (s * s * h) / 3;
    if (back) return [{ text: 'Volume is a third of the base times the height, so three times the volume is the base times the height:' }, { tex: `3 \\times ${V} = ${3 * V}` }, { tex: `x = ${3 * V} \\div ${s * s} = ${h}` }];
    return [{ text: 'A third of the base times the height:' }, { tex: `\\text{base} = ${s}^2 = ${s * s}` }, { tex: `V = \\tfrac{1}{3} \\times ${s * s} \\times ${h} = ${V}` }];
  },
};

interface ConeVolParams {
  r: number;
  h: number;
  given: 'r' | 'd';
}

const geoConeVol: Generator<ConeVolParams> = {
  id: 'geo-cone-vol',
  sample(rng, difficulty) {
    for (;;) {
      const r = rng.int(2, 12);
      const h = rng.int(3, 18);
      if ((r * r * h) % 3 || r === h || h > 4 * r || 2 * r > 3 * h) continue;
      return { r, h, given: difficulty >= 2 ? 'd' : 'r' };
    }
  },
  render({ r, h, given }) {
    const labels = given === 'r' ? { radius: cm(r), height: cm(h) } : { diameter: cm(2 * r), height: cm(h) };
    return piTyped([diagram(coneSvg(r, h, labels)), say('Find the volume of the cone in\u00a0cm³. Leave $\\pi$ in the answer.')], (r * r * h) / 3);
  },
  choices({ r, h }) {
    return piOptions((r * r * h) / 3, [r * r * h, (r * h) / 3, (2 * r * r * h) / 3].filter(Number.isInteger));
  },
  solution({ r, h, given }) {
    return [
      ...(given === 'd' ? [{ text: 'Halve the diameter for the radius:' }, { tex: `r = ${2 * r} \\div 2 = ${r}` }] : []),
      { text: 'The circle times the height, then a third of that:' },
      { tex: `\\pi \\times ${r}^2 \\times ${h} = ${piTex(r * r * h)}` },
      { tex: `V = \\tfrac{1}{3} \\times ${piTex(r * r * h)} = ${piTex((r * r * h) / 3)}` },
    ];
  },
};

interface SphereParams {
  r: number;
  hemi: boolean;
}

const sphereK = ({ r, hemi }: SphereParams) => ((hemi ? 2 : 4) * r ** 3) / 3;

/** Radii that keep ⁴⁄₃r³ a whole or half number: multiples of 1.5. */
const SPHERE_R = [1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5, 15, 18, 21, 24, 27, 30];

const sphereFig = (p: SphereParams, given: 'r' | 'd') => diagram(sphereSvg(given === 'r' ? { radius: cm(p.r) } : { diameter: cm(2 * p.r) }, p.hemi));

interface SphereVolParams extends SphereParams {
  given: 'r' | 'd';
}

const sphereSteps = (p: SphereVolParams) => [
  ...(p.given === 'd' ? [{ text: 'Halve the diameter for the radius:' }, { tex: `r = ${num(2 * p.r)} \\div 2 = ${num(p.r)}` }] : []),
  { tex: `r^3 = ${num(p.r)}^3 = ${num(p.r ** 3)}` },
  p.hemi
    ? { tex: `V = \\tfrac{1}{2} \\times \\tfrac{4}{3} \\times ${piTex(p.r ** 3)} = ${piTex(sphereK(p))}` }
    : { tex: `V = \\tfrac{4}{3} \\times ${piTex(p.r ** 3)} = ${piTex(sphereK(p))}` },
];

const geoSphereVol: Generator<SphereVolParams> = {
  id: 'geo-sphere-vol',
  sample(rng, difficulty) {
    return { r: rng.pick(SPHERE_R), hemi: difficulty >= 2 && rng.int(0, 1) === 1, given: rng.pick(['r', 'd'] as const) };
  },
  render(p) {
    return piTyped([sphereFig(p, p.given), say(`Find the volume of the ${p.hemi ? 'hemisphere' : 'sphere'} in\u00a0cm³. Leave $\\pi$ in the answer.`)], sphereK(p));
  },
  choices(p) {
    const k = sphereK(p);
    return piOptions(k, [p.r ** 3, 4 * p.r * p.r, 2 * k]);
  },
  solution: sphereSteps,
};

const geoSphereTiles: Generator<SphereVolParams> = {
  id: 'geo-sphere-tiles',
  sample(rng, difficulty) {
    return { r: rng.pick(SPHERE_R), hemi: difficulty >= 2, given: rng.pick(['r', 'd'] as const) };
  },
  render(p): Slide {
    const answers = [p.r ** 3, sphereK(p)];
    return {
      kind: 'tiles',
      prompt: [sphereFig(p, p.given), say(`Find $r^3$, then the volume of the ${p.hemi ? 'hemisphere' : 'sphere'} in\u00a0cm³.`)],
      template: 'r^3 = {0} \\qquad V = {1}\\pi',
      bank: numberBank(answers, [3 * p.r, p.r * p.r, 4 * p.r * p.r, (4 * p.r ** 3) / 3 / (p.hemi ? 1 : 2)].filter((v) => !answers.includes(v)), 3, 0.5, 0.5),
      answer: answers.map(num),
    };
  },
  solution: sphereSteps,
};

export const geometryVolumeGenerators = [
  geoCuboidVol,
  geoPrismVol,
  geoPrismVolTree,
  geoCylinderVol,
  geoCylinderTiles,
  geoVolFactor,
  geoPyramidVol,
  geoConeVol,
  geoSphereVol,
  geoSphereTiles,
];
