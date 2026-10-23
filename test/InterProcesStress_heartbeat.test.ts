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

describe('同キーを使った複数プロセスによるハートビートも考慮した同時ロックテスト', () => {

  it("2プロセス", async () => {
  });

  if (isCI) return;

  it("5プロセス", async () => {
  });

  it("10プロセス", async () => {
  });

  it("25プロセス", async () => {
  });

  it("50プロセス", async () => {
  });

});


