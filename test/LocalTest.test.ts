import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
//import fs from 'node:fs';

import { FileLock, type FileLockConfig } from '../src/index.ts';
import { sleepAsync, execChild, isCI, type Options } from './FileLockTestCommon.ts';


let orgConfig: FileLockConfig;

beforeEach(() => {
  vi.restoreAllMocks();
  orgConfig = FileLock.getConfig();
});

afterEach(() => {
  vi.restoreAllMocks();
  FileLock.setConfig(orgConfig);
});

afterAll(() => {
});

describe('別プロセスとの競合テスト', () => {

  it("dummy", () => {});

  if (isCI) return;

  if (process.env.LOCAL_TEST !== 'true') return;

async function testChildError(key: string, pPara: { sleep: number, timeout: number }, cPara: { sleep: number, timeOutMs?: number, waitAquired?: boolean, ttl?: number }, childFirst: boolean, reason: string): Promise<void> {
    const createParentPr = async () => FileLock.withLock(key, async () => {
        await sleepAsync(pPara.sleep);
        return 'completed'
      },
      { timeoutMs: pPara.timeout }
    );
    const createChild = async () => {
      const cOpts = { key, sleep: cPara.sleep, timeOutMs: cPara.timeOutMs ?? 0, waitAquired: cPara.waitAquired ?? true } as Options;
      if (cPara.ttl) cOpts.ttlMs = cPara.ttl;
      return execChild('lock', cOpts);
    };
    const promises = [] as Promise<unknown>[];
    if (childFirst) {
      // It is necessary to wait for the child process to acquire the lock.
      promises.push((await createChild()).promise);
      promises.push(createParentPr());
    }
    else {
      promises.push(createParentPr());
      promises.push((await createChild()).promise);
    }

    const results = await Promise.allSettled(promises/*[child.promise, parent]*/);

    const cIdx = childFirst ? 0 : 1;
    const pIdx = (cIdx + 1) % 2;
    // The child promise should have failed due to `reason`.
    expect(results[cIdx]).toMatchObject({ status: 'rejected' });
    expect('reason' in results[cIdx] && results[cIdx].reason.includes(reason)).toBeTruthy();
    expect(results[pIdx]).toMatchObject({ status: 'fulfilled', value: 'completed' });
  } 

  it("同じキーを使い、子プロセスを先に起動したがttlエラーになり、処理はキャンセル状態となったところで、親プロセスはロック処理が進む.", async () => {
    // 処理時間(sleep時間)：1000, 鼓動間隔最小値: 1000, ttl最小値1000 -> タイミングにより、TTLエラーの前に、鼓動更新が走るが、正常終了になった後でリリースタイミングと重なることがある。
    const n = 100;//100;
    let errCount = 0;
    for(let i = 0; i < n; ++i) {
     try {
        await testChildError('childTtlError', { sleep: 100, timeout: 5000 }, { sleep: 2000, ttl: 1000/*min is '1000'*/ }, true, 'TTLExceeded');
      }
      catch (_err) {
        errCount++;
      }
    }
    console.log("######################");
    console.log("#### ERROR COUNT  = ", errCount);
    console.log("#### SCCESS COUNT = ", n - errCount);
    console.log("#### SCCESS RATIO = ", (n - errCount) / n * 100, "%");
    console.log("######################");
  });

});
