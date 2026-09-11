import type { Generator, GeneratorRegistry } from './types';
import { complexGenerators } from './generators/complex';
import { arithmeticGenerators } from './generators/complexArithmetic';
import { planeGenerators } from './generators/complexPlane';
import { differentiationGenerators } from './generators/differentiation';
import { indicesGenerators } from './generators/indices';
import { integrationGenerators } from './generators/integration';
import { logarithmGenerators } from './generators/logarithms';
import { quadraticsGenerators } from './generators/quadratics';
import { vectorGenerators } from './generators/vectors';
import { trigonometryGenerators } from './generators/trigonometry';

export const allGenerators = [
  ...complexGenerators,
  ...arithmeticGenerators,
  ...planeGenerators,
  ...differentiationGenerators,
  ...indicesGenerators,
  ...integrationGenerators,
  ...logarithmGenerators,
  ...quadraticsGenerators,
  ...vectorGenerators,
  ...trigonometryGenerators,
];

/** Every generator the app knows about, keyed by id. */
export const registry: GeneratorRegistry = Object.fromEntries(
  allGenerators.map((generator) => [generator.id, generator as unknown as Generator<never>]),
);
