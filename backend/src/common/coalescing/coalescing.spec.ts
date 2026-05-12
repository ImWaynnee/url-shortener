import type { ICoalescingService } from '@common/coalescing/coalescing.interface';
import { InMemoryCoalescingService } from '@common/coalescing/in-memory-coalescing.service';

/**
 * NoOpCoalescingService — the "without coalescing" baseline.
 * Every caller invokes the fetcher independently; no deduplication.
 */
class NoOpCoalescingService implements ICoalescingService {
  coalesce<T>(_key: string, fetcher: () => Promise<T>): Promise<T> {
    return fetcher();
  }
}

/**
 * Helper: builds a fetcher that takes `delayMs` to resolve and increments
 * a shared `callCount` each time it is invoked.
 */
function makeSlowFetcher(delayMs: number): {
  fetcher: () => Promise<string>;
  callCount: () => number;
} {
  let count = 0;
  return {
    fetcher: () =>
      new Promise<string>((resolve) => {
        count++;
        setTimeout(() => resolve('result'), delayMs);
      }),
    callCount: () => count,
  };
}

describe('Coalescing — negative case: without vs. with', () => {
  /**
   * Negative case — shows the PROBLEM coalescing solves.
   *
   * Without coalescing, every concurrent cache-miss caller fires its own
   * fetcher independently. With 10 concurrent callers and a 20 ms fetcher,
   * the underlying resource is hit 10 times.
   */
  it('WITHOUT coalescing: 10 concurrent callers each invoke the fetcher (stampede)', async () => {
    const noop = new NoOpCoalescingService();
    const { fetcher, callCount } = makeSlowFetcher(20);

    await Promise.all(
      Array.from({ length: 10 }, () => noop.coalesce('key', fetcher)),
    );

    expect(callCount()).toBe(10); // every caller hit the fetcher
  });

  /**
   * Positive case — shows the FIX.
   *
   * With InMemoryCoalescingService, all 10 concurrent callers share the
   * single in-flight promise. The fetcher is invoked exactly once.
   */
  it('WITH InMemoryCoalescingService: 10 concurrent callers trigger only one fetcher invocation', async () => {
    const service = new InMemoryCoalescingService();
    const { fetcher, callCount } = makeSlowFetcher(20);

    const results = await Promise.all(
      Array.from({ length: 10 }, () => service.coalesce('key', fetcher)),
    );

    expect(callCount()).toBe(1); // fetcher called exactly once
    expect(results).toEqual(Array(10).fill('result')); // all callers got the result
  });

  /**
   * Isolation check — after the first batch settles, a new call starts a
   * fresh fetch (the in-flight Map entry is cleaned up by `.finally()`).
   */
  it('WITH InMemoryCoalescingService: a call after the first batch resolved makes a fresh fetch', async () => {
    const service = new InMemoryCoalescingService();
    const { fetcher, callCount } = makeSlowFetcher(10);

    // First wave — all coalesced into one
    await Promise.all(
      Array.from({ length: 5 }, () => service.coalesce('key', fetcher)),
    );

    expect(callCount()).toBe(1);

    // Second call after settlement — treated as a new request
    await service.coalesce('key', fetcher);

    expect(callCount()).toBe(2); // one fresh fetch
  });

  /**
   * Key isolation — concurrent callers for DIFFERENT keys each get their own
   * fetcher invocation; coalescing is per-key, not global.
   */
  it('WITH InMemoryCoalescingService: different keys are fetched independently', async () => {
    const service = new InMemoryCoalescingService();
    const { fetcher: fetcherA, callCount: countA } = makeSlowFetcher(20);
    const { fetcher: fetcherB, callCount: countB } = makeSlowFetcher(20);

    await Promise.all([
      service.coalesce('keyA', fetcherA),
      service.coalesce('keyA', fetcherA),
      service.coalesce('keyB', fetcherB),
      service.coalesce('keyB', fetcherB),
    ]);

    expect(countA()).toBe(1); // keyA coalesced into one
    expect(countB()).toBe(1); // keyB coalesced into one
  });
});
