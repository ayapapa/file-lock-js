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


describe('すべて別同キーの複数のプロセス同時ロックテスト', () => {

  it("2プロセス", async () => {
    await testMultiProcess(2);
  });

  if (isCI) return;

  it("5プロセス", async () => {
    await testMultiProcess(5);
  });

  it("10プロセス", async () => {
    await testMultiProcess(10);
  });

  it("25プロセス", async () => {
    await testMultiProcess(25);
  });

  it("50プロセス", async () => {
    await testMultiProcess(50);
  });

  it("100プロセス", async () => {
    await testMultiProcess(100);
  });

});


/*

複数子プロセス → 同時Lock競合
TTL / Heartbeat
子Lock中 → TTL超過
子Lock中 → Heartbeat timeout
TTL + Heartbeat両方無効 → Lock失効
子プロセス異常終了
子Lock中 → 正常終了（Unlockあり）
子Lock中 → process.exit()（Unlockなし）
子Lock中 → 親から強制終了
子Lock中 → 例外終了
子プロセス異常終了後 → 親がLock再取得
プロセス境界
親のreentry状態 → 子ではreentryにならない
別プロセス間では同一Lockを同時保持できない
*/
