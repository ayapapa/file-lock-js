import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { type FileLockConfig, FileLock, QueueManager, QueueMaxPendingExceeded, type QueueMgrConfig } from '../src/index.ts';
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
    const pr = [] as Promise<number>[];
    const n = 5;
    for (let i = 0; i < n; i++) {
      pr.push(qm.enqueue(async () => {
        for (let j = 0; j < 5; j++) {
          await sleepAsync(100);
        }
        return i;
      }, {
        timeout: 5000,
        reason: new Error("timeout!"),
      }));
    }
    expect(qm.numberOfAllEntries).toBe(5);
    expect(qm.numberOfRunning).toBe(1);
    expect(qm.numberOfPending).toBe(4);
    const results = await Promise.allSettled(pr);
    expect(results.length).toBe(5);
    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      expect(res).toMatchObject({
        status: 'fulfilled',
        value: i,
      });
    }
 });

  it("maxPending: 1, add 5 tasks.", async () => {
    const qm = new QueueManager({ maxConcurrency:1, maxPending: 1 });
    const pr = [] as Promise<number>[];
    const n = 5;
    const reason = new Error("timeout!");
    for (let i = 0; i < n; i++) {
      pr.push(qm.enqueue(async () => {
        for (let j = 0; j < 5; j++) {
          await sleepAsync(100);
        }
        return i;
      }, {
        timeout: 5000,
        reason,
      }));
    }
    expect(qm.numberOfAllEntries).toBe(2);
    expect(qm.numberOfRunning).toBe(1);
    expect(qm.numberOfPending).toBe(1);
    const results = await Promise.allSettled(pr);
    let i= 0;
    for (; i < 2; i++) {
      expect(results[i]).toMatchObject({
        status: 'fulfilled',
        value: i,
      });
    }
    for (; i < results.length; i++) {
      const res = results[i] as PromiseRejectedResult;
      expect(res).toMatchObject({
        status: 'rejected',
      });
      expect(res.reason).instanceOf(QueueMaxPendingExceeded);
    }
  });

});
