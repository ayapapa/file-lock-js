import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { type FileLockConfig, FileLock, QueueManager, type QueueMgrConfig } from '../src/index.ts';
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

describe('QueueManager', () => {

  it('exports public types', () => {
    expectTypeOf<QueueMgrConfig>().toEqualTypeOf<{
      maxConcurrency?: number,
      maxPending?: number,
     }>();
  });

  it("new QueueManager.", () => {
    const qm = new QueueManager();
    expect(qm.maxConcurrency).toBe(5);
    expect(qm.maxPeding).toBe(500);
  });

  it("new QueueManager.", () => {
    const qm = new QueueManager({ maxConcurrency:10, maxPending: 100 });
    expect(qm.maxConcurrency).toBe(10);
    expect(qm.maxPeding).toBe(100);
  });

  it("maxPending: 10, add 5 tasks.", async () => {
    const qm = new QueueManager({ maxConcurrency:1, maxPending: 10 });
    const pr = [] as Promise<void>[];
    const n = 5;
    for (let i = 0; i < n; i++) {
      pr.push(qm.enqueue(async () => {
        for (let j = 0; j < 5; j++) {
          await sleepAsync(100);
        }
      }, {
        timeout: 5000,
        reason: new Error("timeout!"),
      }));
    }
    expect(qm.numberOfAllEntries).toBe(5);
    const results = await Promise.allSettled(pr);
    expect(results.length).toBe(5);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('fulfilled');
    expect(results[2].status).toBe('fulfilled');
    expect(results[3].status).toBe('fulfilled');
    expect(results[4].status).toBe('fulfilled');
 });

  it("maxPending: 1, add 5 tasks.", async () => {
    const qm = new QueueManager({ maxConcurrency:1, maxPending: 1 });
    const pr = [] as Promise<void>[];
    const n = 5;
    for (let i = 0; i < n; i++) {
      pr.push(qm.enqueue(async () => {
        for (let j = 0; j < 5; j++) {
          await sleepAsync(100);
        }
      }, {
        timeout: 5000,
        reason: new Error("timeout!"),
      }));
    }
    expect(qm.numberOfAllEntries).toBe(2);
    const results = await Promise.allSettled(pr);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('fulfilled');
    expect(results[2].status).toBe('rejected');
    expect(results[3].status).toBe('rejected');
    expect(results[4].status).toBe('rejected');
  });

});
