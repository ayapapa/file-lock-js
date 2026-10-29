import { afterAll, afterEach, beforeAll, beforeEach, describe, it, vi } from 'vitest';

import { FileLock, type FileLockConfig } from '../src/index.ts';
import {  eachAfterStressTest,  init, isCI, report, resetExecResources, testMultiProcess } from './FileLockTestCommon.ts';

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

describe('Concurrent locking test that also accounts for heartbeats from multiple processes using the same key.', () => {

  it("2 processes.", async () => {
    await testMultiProcess(2, 'StressHeartbeat2', { sleep: 4500, timout: 10000, hbTtl: 10000 });
  });

  if (isCI) return;

  it("5 processes.", async () => {
    await testMultiProcess(5, 'StressHeartbeat5', { sleep: 4500, timout: 10000, hbTtl: 10000 });
  });

  it("10 processes.", async () => {
    await testMultiProcess(10, 'StressHeartbeat10', { sleep: 4500, timout: 10000, hbTtl: 10000 });
  });

/* Increasing the load any further will only result in more processes failing to release their locks, making it largely meaningless as a heartbeat test.
  it("25 processes.", async () => {
    await testMultiProcess(25, 'StressHeartbeat25', { sleep: 4500, timout: 1npm test0000, hbTtl: 10000 });
  });
  it("50 processes.", async () => {
    await testMultiProcess(50, 'StressHeartbeat50', { sleep: 1500, timout: 10000, hbTtl: 10000 });
  });

  it("100 processes.", async () => {
    await testMultiProcess(100, 'StressHeartbeat100', { sleep: 1500, timout: 10000, hbTtl: 10000 });
  });
  */
});


