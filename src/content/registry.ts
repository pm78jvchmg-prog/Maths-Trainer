import type { Generator, GeneratorRegistry } from './types';
import { choiceVariants } from './choiceVariant';

/**
 * Every exported array named `…Generators` in `generators/*.ts`, found by the
 * bundler rather than listed by hand.
 *
 * This used to be an import and a spread per file, and with several content
 * branches open at once every one of them added a line to the same two lists,
 * so each landing put the others into a merge conflict. Now a new generator
 * file needs no wiring here: export its array under a name ending in
 * `Generators` and it is registered.
 *
 * A file may re-export another file's generators (`indices.ts` spreads
 * `growth.ts`, `quadraticShapes.ts` spreads three files), so the same object
 * can be found twice; it is kept once. Two *different* generators with one id
 * would make the registry silently keep the last, so that throws instead.
 * Order is by file path, then export order — nothing the app shows depends on
 * it, since lessons name generators by id.
 */
const modules = import.meta.glob<Record<string, unknown>>(['./generators/*.ts', '!./generators/*.test.ts'], {
  eager: true,
});

function isGenerator(value: unknown): value is Generator<unknown> {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { sample?: unknown }).sample === 'function'
  );
}

function discoverGenerators(): Generator<unknown>[] {
  const found = new Map<string, Generator<unknown>>();
  for (const path of Object.keys(modules).sort()) {
    for (const [name, value] of Object.entries(modules[path])) {
      if (!name.endsWith('Generators') || !Array.isArray(value)) continue;
      for (const generator of value) {
        if (!isGenerator(generator)) {
          throw new Error(`${path}: ${name} holds something that is not a generator`);
        }
        const existing = found.get(generator.id);
        if (existing && existing !== generator) {
          throw new Error(`${path}: two different generators share the id "${generator.id}"`);
        }
        found.set(generator.id, generator);
      }
    }
  }
  return [...found.values()];
}

/**
 * Every generator that declares a multiple-choice form also gets that form
 * registered, under `<id>+choice`. Derived rather than written out so a lesson
 * can vary its question shape without anyone maintaining a parallel generator.
 */
export const allGenerators = discoverGenerators();

/** The base generators plus the choice form of every one that declares it. */
export const registeredGenerators = [...allGenerators, ...choiceVariants(allGenerators)];

/** Every generator the app knows about, keyed by id. */
export const registry: GeneratorRegistry = Object.fromEntries(
  registeredGenerators.map((generator) => [generator.id, generator as unknown as Generator<never>]),
);
