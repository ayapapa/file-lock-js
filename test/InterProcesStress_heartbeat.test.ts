import { afterAll, afterEach, beforeAll, beforeEach, describe, it, vi } from 'vitest';

import { FileLock, type FileLockConfig } from '../src/index.ts';
import {  eachAfterStressTest,  init, isCI, report, resetExecResources, /*testMultiProcess*/ } from './FileLockTestCommon.ts';

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
  });

  if (isCI) return;

  it("5 processes.", async () => {
  });

  it("10 processes.", async () => {
  });

  it("25 processes.", async () => {
  });

  it("50 processes.", async () => {
  });

});


