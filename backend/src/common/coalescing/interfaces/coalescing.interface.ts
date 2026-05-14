import type Redis from 'ioredis';

export const COALESCING_SERVICE = Symbol('ICoalescingService');
export const COALESCING_REDIS_CLIENT = Symbol('COALESCING_REDIS_CLIENT');

/** Type alias for the ioredis client bound to COALESCING_REDIS_CLIENT. */
export type CoalescingRedisClient = Redis;

export interface ICoalescingService {
  coalesce<T>(key: string, fetcher: () => Promise<T>): Promise<T>;
}
