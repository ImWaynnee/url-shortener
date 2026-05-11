export const COALESCING_SERVICE = Symbol('ICoalescingService');
export const COALESCING_REDIS_CLIENT = Symbol('COALESCING_REDIS_CLIENT');

export interface ICoalescingService {
  coalesce<T>(key: string, fetcher: () => Promise<T>): Promise<T>;
}
