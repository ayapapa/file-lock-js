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


describe('同キーを使った複数プロセス同時ロックテスト', () => {

  it("2プロセス", async () => {
    await testMultiProcess(2, "multiProcessLockWithSameKey2");
  });

  if (isCI) return;

  it("5プロセス", async () => {
    await testMultiProcess(5, "multiProcessLockWithSameKey5");
  });

  it("10プロセス", async () => {
    await testMultiProcess(10, "multiProcessLockWithSameKey10");
  });

  it("25プロセス", async () => {
    await testMultiProcess(25, "multiProcessLockWithSameKey25");
  });

  it("50プロセス", async () => {
    await testMultiProcess(50, "multiProcessLockWithSameKey50");
  });

  it("100プロセス", async () => {
    await testMultiProcess(100, "multiProcessLockWithSameKey100");
  });

});

