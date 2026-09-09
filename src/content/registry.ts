import type { Generator, GeneratorRegistry } from './types';
import { complexGenerators } from './generators/complex';

/** Every generator the app knows about, keyed by id. */
export const registry: GeneratorRegistry = Object.fromEntries(
  complexGenerators.map((generator) => [generator.id, generator as unknown as Generator<never>]),
);

export const allGenerators = complexGenerators;
