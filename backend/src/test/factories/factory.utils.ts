/* istanbul ignore file */

/**
 * Returns a counter function that increments on each call.
 * Use one sequence per factory to get stable, readable IDs in tests.
 *
 * @example
 * const nextId = createSequence();
 * nextId() // => BigInt(1)
 * nextId() // => BigInt(2)
 */
export function createSequence(start = 1): () => bigint {
  let current = start;
  return () => BigInt(current++);
}

/**
 * Creates `count` instances of T by calling `factory` once per item,
 * optionally merging per-item overrides from the `overrides` array.
 */
export function makeMany<T>(
  factory: (overrides?: Partial<T>) => T,
  count: number,
  overrides: Partial<T>[] | Partial<T> = []
): T[] {
  return Array.from({ length: count }, (_, i) => {
    const override = Array.isArray(overrides) ? overrides[i] : overrides;
    return factory(override ?? {});
  });
}
