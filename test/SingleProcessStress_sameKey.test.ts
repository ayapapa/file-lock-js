import { afterAll, afterEach, beforeAll, beforeEach, describe, it, vi } from 'vitest';

import { FileLock, type FileLockConfig } from '../src/index.ts';
import {  eachAfterStressTest,  init, isCI, report, resetExecResources, sleepAsync, testMultiProcess } from './FileLockTestCommon.ts';

let orgConfig: FileLockConfig;

beforeAll(() => {
  init();
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
  report();
});

async function singleProcessMultiLockTest(param: { n: number, sameKey: boolean, queue: boolean, maxConcurrency: number, sleep: number, timeout: number }) {
  const pr: Promise<unknown>[] = [];
  FileLock.setConfig({ queue: param.queue, maxConcurrency:param.maxConcurrency })
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

  it("2 processes.", async () => {
    await singleProcessMultiLockTest({
      n: 20, 
      sameKey: true, 
      queue: true, 
      maxConcurrency: 20, 
      sleep: 500, 
      timeout: 5000
    });
  });
// return;
/*
  it("5 processes.", async () => {
    await singleProcessMultiLockTest(20, true, 10);
  });
*/
});

