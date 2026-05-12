import { COALESCING_REDIS_CLIENT } from '@common/coalescing/coalescing.interface';
import { RedisPubSubCoalescingService } from '@common/coalescing/redis-coalescing.service';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { EventEmitter } from 'events';

// ---------------------------------------------------------------------------
// Redis mock
// ---------------------------------------------------------------------------

/**
 * Minimal ioredis mock. `sub` is a separate EventEmitter so tests can
 * simulate incoming pub/sub messages by calling sub.emit('message', ...).
 */
function makeRedisMock() {
  const sub = new EventEmitter() as EventEmitter & {
    subscribe: jest.Mock;
    unsubscribe: jest.Mock;
    quit: jest.Mock;
  };
  sub.subscribe = jest.fn().mockResolvedValue(1);
  sub.unsubscribe = jest.fn().mockResolvedValue(0);
  sub.quit = jest.fn().mockResolvedValue('OK');

  const redis = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    publish: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue('OK'),
    duplicate: jest.fn().mockReturnValue(sub),
  };

  return {
    redis,
    sub 
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSuccessPayload(data: unknown) {
  return JSON.stringify({
    ok: true,
    data 
  });
}

function makeErrorPayload(message: string) {
  return JSON.stringify({
    ok: false,
    error: message 
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RedisPubSubCoalescingService', () => {
  let service: RedisPubSubCoalescingService;
  let redis: ReturnType<typeof makeRedisMock>['redis'];
  let sub: ReturnType<typeof makeRedisMock>['sub'];

  beforeEach(async () => {
    ({ redis, sub } = makeRedisMock());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisPubSubCoalescingService,
        {
          provide: COALESCING_REDIS_CLIENT,
          useValue: redis 
        },
      ],
    }).compile();

    service = module.get(RedisPubSubCoalescingService);
    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  describe('onModuleInit', () => {
    it('should create a subscriber connection via duplicate()', () => {
      expect(redis.duplicate).toHaveBeenCalledTimes(1);
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit both the subscriber and primary Redis connections', async () => {
      await service.onModuleDestroy();
      expect(sub.quit).toHaveBeenCalledTimes(1);
      expect(redis.quit).toHaveBeenCalledTimes(1);
    });

    it('should not throw if onModuleInit never ran (sub is undefined)', async () => {
      // Create a bare instance without calling onModuleInit
      const bare = new RedisPubSubCoalescingService(redis as never);
      await expect(bare.onModuleDestroy()).resolves.not.toThrow();
      expect(redis.quit).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Lock-holder path (acquired === 'OK')
  // -------------------------------------------------------------------------

  describe('coalesce — lock-holder path', () => {
    it('should invoke fetcher, persist payload, publish done, and return result', async () => {
      redis.set.mockResolvedValue('OK'); // SET NX succeeds
      redis.del.mockResolvedValue(1);

      const result = await service.coalesce('myKey', async () => 'hello');

      expect(redis.set).toHaveBeenCalledWith(
        'lock:myKey', '1', 'EX', expect.any(Number), 'NX',
      );
      expect(redis.set).toHaveBeenCalledWith(
        'result:myKey',
        makeSuccessPayload('hello'),
        'PX',
        expect.any(Number),
      );
      expect(redis.publish).toHaveBeenCalledWith('notify:myKey', 'done');
      expect(redis.del).toHaveBeenCalledWith('lock:myKey');
      expect(result).toBe('hello');
    });

    it('should delete the lock in finally even when fetcher throws', async () => {
      redis.set.mockResolvedValue('OK');
      redis.del.mockResolvedValue(1);

      const fetcher = jest.fn().mockRejectedValue(new Error('db error'));

      await expect(service.coalesce('myKey', fetcher)).rejects.toThrow('db error');
      expect(redis.del).toHaveBeenCalledWith('lock:myKey');
    });

    it('should publish an error payload when fetcher throws so waiters fail fast', async () => {
      redis.set.mockResolvedValue('OK');
      redis.del.mockResolvedValue(1);

      await expect(
        service.coalesce('myKey', async () => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');

      expect(redis.set).toHaveBeenCalledWith(
        'result:myKey',
        makeErrorPayload('boom'),
        'PX',
        expect.any(Number),
      );
      expect(redis.publish).toHaveBeenCalledWith('notify:myKey', 'done');
    });

    it('should still re-throw the original error if publishing the error payload fails', async () => {
      redis.set
        .mockResolvedValueOnce('OK') // SET NX
        .mockRejectedValueOnce(new Error('redis down')); // SET resultKey for error payload
      redis.del.mockResolvedValue(1);

      await expect(
        service.coalesce('myKey', async () => {
          throw new Error('original error');
        }),
      ).rejects.toThrow('original error');
    });
  });

  // -------------------------------------------------------------------------
  // Waiter path (lock already held by another caller)
  // -------------------------------------------------------------------------

  describe('coalesce — waiter path', () => {
    beforeEach(() => {
      // Lock is already held — SET NX returns null
      redis.set.mockResolvedValue(null);
      // No early result in Redis by default
      redis.get.mockResolvedValue(null);
    });

    it('should subscribe to the channel and resolve when "done" is published with a success payload', async () => {
      const promise = service.coalesce<string>('myKey', jest.fn());

      // Allow subscribe to settle
      await Promise.resolve();
      await Promise.resolve();

      redis.get.mockResolvedValue(makeSuccessPayload('world'));
      sub.emit('message', 'notify:myKey', 'done');

      await expect(promise).resolves.toBe('world');
    });

    it('should reject when "done" is published with an error payload', async () => {
      const promise = service.coalesce<string>('myKey', jest.fn());

      await Promise.resolve();
      await Promise.resolve();

      redis.get.mockResolvedValue(makeErrorPayload('lock-holder failed'));
      sub.emit('message', 'notify:myKey', 'done');

      await expect(promise).rejects.toThrow('lock-holder failed');
    });

    it('should resolve immediately if resultKey already exists after subscribing (race condition fix)', async () => {
      // Result is already in Redis by the time subscribe() completes
      redis.get.mockResolvedValue(makeSuccessPayload('early'));

      const result = await service.coalesce<string>('myKey', jest.fn());

      expect(result).toBe('early');
      expect(sub.subscribe).toHaveBeenCalledWith('notify:myKey');
    });

    it('should ignore messages on other channels', async () => {
      const promise = service.coalesce<string>('myKey', jest.fn());

      await Promise.resolve();
      await Promise.resolve();

      // Emit on a different channel — should not settle `promise`
      sub.emit('message', 'notify:otherKey', 'done');

      // Now emit on the correct channel
      redis.get.mockResolvedValue(makeSuccessPayload('correct'));
      sub.emit('message', 'notify:myKey', 'done');

      await expect(promise).resolves.toBe('correct');
    });

    it('should reject with timeout error if no notification arrives within LOCK_TTL_MS', async () => {
      jest.useFakeTimers();

      redis.get.mockResolvedValue(null);
      const promise = service.coalesce<string>('myKey', jest.fn());

      // Flush microtasks: SET NX mock → subscribe mock → early-check GET mock
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      jest.advanceTimersByTime(6000); // past LOCK_TTL_MS (5000)

      // Flush the microtasks queued by finish() inside the timeout callback
      await Promise.resolve();
      await Promise.resolve();

      await expect(promise).rejects.toThrow('Coalescing timed out');

      jest.useRealTimers();
    }, 10000);

    it('should unsubscribe from the channel after settling', async () => {
      const promise = service.coalesce<string>('myKey', jest.fn());

      await Promise.resolve();
      await Promise.resolve();

      redis.get.mockResolvedValue(makeSuccessPayload('done'));
      sub.emit('message', 'notify:myKey', 'done');

      await promise;

      expect(sub.unsubscribe).toHaveBeenCalledWith('notify:myKey');
    });

    it('should only subscribe once for multiple concurrent waiters on the same key (ref-counting)', async () => {
      // Three concurrent waiters on the same key
      const p1 = service.coalesce<string>('myKey', jest.fn());
      const p2 = service.coalesce<string>('myKey', jest.fn());
      const p3 = service.coalesce<string>('myKey', jest.fn());

      await Promise.resolve();
      await Promise.resolve();

      redis.get.mockResolvedValue(makeSuccessPayload('shared'));
      sub.emit('message', 'notify:myKey', 'done');

      const results = await Promise.all([p1, p2, p3]);

      expect(sub.subscribe).toHaveBeenCalledTimes(1); // one Redis subscribe
      expect(results).toEqual(['shared', 'shared', 'shared']);
    });
  });

  // -------------------------------------------------------------------------
  // subscribeChannel — guard
  // -------------------------------------------------------------------------

  describe('subscribeChannel guard', () => {
    it('should throw if onModuleInit has not run', async () => {
      const bare = new RedisPubSubCoalescingService(redis as never);
      // SET NX returns null so it tries the waiter path → subscribeChannel
      redis.set.mockResolvedValue(null);
      redis.get.mockResolvedValue(null);

      await expect(bare.coalesce('key', jest.fn())).rejects.toThrow(
        'RedisPubSubCoalescingService: onModuleInit has not run',
      );
    });
  });
});
