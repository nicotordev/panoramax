import pLimit from "p-limit";

/**
 * Map items with a fixed concurrency limit (detail page fetches, etc.).
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const limit = pLimit(Math.max(1, concurrency));
  return Promise.all(items.map((item, index) => limit(() => fn(item, index))));
}
