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

describe('Simultaneous locking test for multiple processes using distinct keys.', () => {

  it("2 processes.", async () => {
    await testMultiProcess(2);
  });

  if (isCI) return;

  it("5 processes.", async () => {
    await testMultiProcess(5);
  });

  it("10 processes.", async () => {
    await testMultiProcess(10);
  });

  it("25 processes.", async () => {
    await testMultiProcess(25);
  });

  it("50 processes.", async () => {
    await testMultiProcess(50);
  });

  it("100 processes.", async () => {
    await testMultiProcess(100);
  });

});
