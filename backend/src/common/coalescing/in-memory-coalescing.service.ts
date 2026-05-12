import { ICoalescingService } from '@common/coalescing/coalescing.interface';
import { Injectable } from '@nestjs/common';

/**
 * In-memory coalescing using a plain Map.
 *
 * Works for single-instance deployments only. 
 */
@Injectable()
export class InMemoryCoalescingService implements ICoalescingService {
  private readonly inflight = new Map<string, Promise<unknown>>();

  coalesce<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    if (this.inflight.has(key)) return this.inflight.get(key) as Promise<T>;

    const promise = fetcher().finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return promise;
  }
}
