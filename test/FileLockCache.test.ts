import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type FileLockConfig, FileLock } from '../src/index.ts';
import { Cache } from '../src/lib/Cache.ts';
import { sleepAsync } from './FileLockTestCommon.ts'


let orgConfig: FileLockConfig;
beforeEach(() => {
  vi.restoreAllMocks();
  orgConfig = FileLock.getConfig();
});

afterEach(() => {
  vi.restoreAllMocks();
  FileLock.setConfig(orgConfig);
});

describe('Cache', () => {
  // Cache
  it("Cache", () => {
    expect(() => new Cache()).not.toBeUndefined();
    expect(() => new Cache({ max: -1 })).toThrow(RangeError);
    expect(() => new Cache({ ttlMs: -1 })).toThrow(RangeError);
  });

  it("Cache max === 1", () => {
    const cache = new Cache({ max: 1 });
    cache.set('CacheMax1_1', 'CacheMax1');
    cache.set('CacheMax1_2', 'CacheMax1');
    expect(cache.size).toBe(1);
  });

  it("Cache.clear", () => {
    const cache = new Cache();
    cache.set('CacheMax1_1', 'CacheMax1');
    cache.set('CacheMax1_2', 'CacheMax1');
    expect(cache.size).toBe(2);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it("Cache expired(set&get)", async () => {
    const key = 'Cache expired get';
    const cache = new Cache({ ttlMs: 1 });
    cache.set(key, key);
    await sleepAsync(100);
    cache.get(key);
    expect(cache.size).toBe(0);
  });

  it("Cache expired(set&set)", async () => {
    const key = 'Cache expired';
    const cache = new Cache({ ttlMs: 1 });
    cache.set(key, key);
    await sleepAsync(100);
    cache.set(key, key);
    expect(cache.size).toBe(1);
  });
});
