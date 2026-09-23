import type { Generator, GeneratorRegistry } from './types';
import { choiceVariants } from './choiceVariant';
import { complexGenerators } from './generators/complex';
import { arithmeticGenerators } from './generators/complexArithmetic';
import { binomialGenerators } from './generators/binomialExpansion';
import { planeGenerators } from './generators/complexPlane';
import { differentiationGenerators } from './generators/differentiation';
import { differentiationShapeGenerators } from './generators/differentiationShapes';
import { exponentialModelGenerators } from './generators/exponentialModels';
import { indicesGenerators } from './generators/indices';
import { integrationGenerators } from './generators/integration';
import { integrationShapeGenerators } from './generators/integrationShapes';
import { linearEquationsGenerators } from './generators/linearEquations';
import { logarithmGenerators } from './generators/logarithms';
import { matrixGenerators } from './generators/matrices';
import { quadraticsGenerators } from './generators/quadratics';
import { quadraticShapeGenerators } from './generators/quadraticShapes';
import { vectorGenerators } from './generators/vectors';
import { trigonometryGenerators } from './generators/trigonometry';
import { trigIdentityGenerators } from './generators/trigIdentities';
import { workingGenerators } from './generators/working';

/**
 * Every generator that declares a multiple-choice form also gets that form
 * registered, under `<id>+choice`. Derived rather than written out so a lesson
 * can vary its question shape without anyone maintaining a parallel generator.
 */
export const allGenerators = [
  ...complexGenerators,
  ...arithmeticGenerators,
  ...planeGenerators,
  ...differentiationGenerators,
  ...differentiationShapeGenerators,
  ...indicesGenerators,
  ...integrationGenerators,
  ...integrationShapeGenerators,
  ...linearEquationsGenerators,
  ...logarithmGenerators,
  ...exponentialModelGenerators,
  ...quadraticsGenerators,
  ...quadraticShapeGenerators,
  ...vectorGenerators,
  ...matrixGenerators,
  ...trigonometryGenerators,
  ...trigIdentityGenerators,
  ...binomialGenerators,
  // The `tree` and `steps` generators, grouped by widget rather than by topic —
  // see the header of `generators/working.ts` for why.
  ...workingGenerators,
];

/** The base generators plus the choice form of every one that declares it. */
export const registeredGenerators = [
  ...allGenerators,
  ...choiceVariants(allGenerators as unknown as Generator<unknown>[]),
];

/** Every generator the app knows about, keyed by id. */
export const registry: GeneratorRegistry = Object.fromEntries(
  registeredGenerators.map((generator) => [generator.id, generator as unknown as Generator<never>]),
);
