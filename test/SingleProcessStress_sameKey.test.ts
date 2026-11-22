import { afterAll, afterEach, beforeAll, beforeEach, describe, it, vi } from 'vitest';

import { FileLock, type FileLockConfig } from '../src/index.ts';
import {  eachAfterStressTest, isCI, resetExecResources, sleepAsync } from './FileLockTestCommon.ts';

let orgConfig: FileLockConfig;

beforeAll(() => {
  //init();
});

beforeEach(() => {
  vi.restoreAllMocks();
  orgConfig = FileLock.getConfig();
  resetExecResources();
});

afterEach(() => {
  vi.restoreAllMocks();
  FileLock.setConfig(orgConfig);
  eachAfterStressTest();
});

afterAll(() => {
  //report();
});

type Params = { n: number, sameKey: boolean, queue: boolean, maxConcurrency: number, sleep: number, timeout: number };

async function singleProcessMultiLockTest(param: Params) {
  const pr: Promise<unknown>[] = [];
  // ★新仕様に合わせよ！！
  // FileLock.setConfig({ queue: param.queue, maxConcurrency:param.maxConcurrency })
  for (let i = 0; i < param.n; ++i) {
    const key = param.sameKey ? 'singleProcessMultiLockTest_sameKey' : `singleProcessMultiLockTest_${i}}`;
    pr.push(FileLock.withLock(key, async () => {
      await sleepAsync(param.sleep);
      return "completed for " + key + ".";
    }, { timeoutMs: param.timeout }));
  }
  const res = await Promise.allSettled(pr);
  //console.log(res);
  let success = 0, error = 0;
  res.forEach(r => {
    if (r.status === 'fulfilled') success++;
    else error++;
  })
  console.log("success =", success, "errors =", error);
}

describe('Simultaneous lock test for single processes using the same key.', () => {
  const options = {
      sameKey : true, 
      queue: true, 
      maxConcurrency: 5, 
      sleep: 100, 
      timeout: 5000
    } as Omit<Params, 'n'>;

  it("2 processes.", async () => {
    await singleProcessMultiLockTest({ n: 2, ...options});
  });

  if (isCI) return;

  it("5 processes.", async () => {
    await singleProcessMultiLockTest({ n: 5, ...options});
  });

  it("10 processes.", async () => {
    await singleProcessMultiLockTest({ n: 10, ...options});
  });

  it("25 processes.", async () => {
    await singleProcessMultiLockTest({ n: 25, ...options});
  });

  it("50 processes.", async () => {
    await singleProcessMultiLockTest({ n: 50, ...options});
  });

  it("100 processes.", async () => {
    await singleProcessMultiLockTest({ n: 100, ...options});
  });

});

describe('Simultaneous lock test for single processes using each key.', () => {
  const options = {
      sameKey : false, 
      queue: true, 
      maxConcurrency: 5, 
      sleep: 100, 
      timeout: 5000
    } as Omit<Params, 'n'>;

  it("2 processes.", async () => {
    await singleProcessMultiLockTest({ n: 2, ...options});
  });

  if (isCI) return;

  it("5 processes.", async () => {
    await singleProcessMultiLockTest({ n: 5, ...options});
  });

  it("10 processes.", async () => {
    await singleProcessMultiLockTest({ n: 10, ...options});
  });

  it("25 processes.", async () => {
    await singleProcessMultiLockTest({ n: 25, ...options});
  });

  it("50 processes.", async () => {
    await singleProcessMultiLockTest({ n: 50, ...options});
  });

  it("100 processes.", async () => {
    await singleProcessMultiLockTest({ n: 100, ...options});
  });

});

