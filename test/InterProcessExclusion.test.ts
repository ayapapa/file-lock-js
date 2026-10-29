import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { AlreadyLocked, FileLock, ReleaseFailed, type FileLockConfig } from '../src/index.ts';
import { getLockMetaPath, removeLockFiles, sleepAsync, execChild, stdOut, childErrCount, childExecCount, childErrors, resetExecResources, TestLock, type Options, getLockMeta, setLockMeta } from './FileLockTestCommon.ts';

const childExecCounts = [] as number[];
const childErrCounts = [] as number[];

let orgConfig: FileLockConfig;

beforeEach(() => {
  vi.restoreAllMocks();
  orgConfig = FileLock.getConfig();
  resetExecResources();
});

afterEach(() => {
  vi.restoreAllMocks();
  FileLock.setConfig(orgConfig);
  childExecCounts.push(childExecCount);
  childErrCounts.push(childErrCount);
});

afterAll(() => {
  console.log("### Child exec count =", childExecCounts);
  console.log("### Child error count =", childErrCounts);
  console.log(`### Child errors(count = ${childErrors.length}) =`, childErrors);
});

describe('Testing for conflicts with other processes.', () => {

  function childCompeleted() {
    for (const v of stdOut) {
      if (v.includes("lock completed")) return true;
    }
    return false;
  }

  it("What happens if you start a child process and then forcibly terminate it?", async () => {
    const key = 'subKey0011';
    const child = await execChild('lock', { key, sleep: 1000, waitAquired: true });

    expect.assertions(3);

    try {
      //await sleepAsync(500);
      child.cid.kill(); // 何を指定しても強制終了となるようだ。
      await child.promise;
    }
    catch(err) {
      expect(err).toBe("child failed: code=null signal=SIGTERM msg=");
    }

    expect(childCompeleted()).toBeFalsy();
    expect(fs.existsSync(getLockMetaPath(key))).toBeTruthy();
    removeLockFiles(key);
  });

  it("By launching the child process first and using a different key for locking, both processes can complete their tasks without interference.", async () => {
    const child = await execChild('lock', { key: 'subKey', sleep: 200 });
    const key = 'mainKey001';
    const start = Date.now();
    await FileLock.withLock(key, async () => {
      await sleepAsync(200);
    })
    const elapsed =  Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(199);
    expect(elapsed).toBeLessThan(1000);
    await child.promise;
    expect(childCompeleted()).toBeTruthy();
  });

  it("Using the same key, the child process is launched first, and the lock is considered complete once that process has been awaited.", async () => {
    const key = 'mainKey002';
    const childSleep = 500;
    const parentSleep = 100;
    const start = Date.now();
    const child = await execChild('lock', { key, sleep: childSleep, waitAquired: true });
    await FileLock.withLock(key, async () => {
      await sleepAsync(parentSleep);
    })
    const elapsed =  Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(childSleep);
    await child.promise;
    expect(childCompeleted()).toBeTruthy();
  });

  it("Using the same key, the parent process is started first, and the child process waits for it before completing its own lock.", async () => {
    const key = 'mainKey002';
    const childSleep = 100;
    const parentSleep = 500;
    const pp = FileLock.withLock(key, async () => {
      await sleepAsync(parentSleep);
      return 'complete'
    })
    const start = Date.now();
    const child = await execChild('lock', { key, sleep: childSleep });
    await child.promise;
    expect(await pp).toBe('complete');
    const elapsed =  Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(parentSleep - 1);
    expect(childCompeleted()).toBeTruthy();
  });

  it("Using the same key, the child process is started first, causing the parent process to encounter a timeout error.", async () => {
    const key = 'mainKey009';
    const child = await execChild('lock', { key, sleep: 1000, waitAquired: true });
    const pp = FileLock.withLock(key, async () => {
        await sleepAsync(100);
        return 'complete';
      },
      { timeoutMs: 0}
    );
    const results = await Promise.allSettled([child.promise, pp]);
    // One of them has resulted in a timeout error (AlreadyLocked).
    expect(results[0]).toMatchObject({
      status: 'fulfilled',
      value: { code: 0, signal: null }
    });
    expect(results[1]).toMatchObject({
      status: 'rejected',
      reason: {
        message: "The `lock file` already exists.",
        code: 'EALREADYLOCKED',
        reason: "ExistingLock",
        key: key
      }
    });
  });

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

  it("Using the same key, the parent process is started first, which causes the child process to encounter a timeout error.", async () => {
    await testChildError('childTimeout', { sleep: 1000, timeout: 500 }, { sleep: 150, waitAquired: false }, false, 'AlreadyLocked');
  });

  it("Using the same key, the child process was launched first, but a TTL error occurred, resulting in the process being cancelled; meanwhile, the parent process proceeded with the locking operation.", async () => {
    await testChildError('childTtlError', { sleep: 100, timeout: 5000 }, { sleep: 2000, ttl: 1000/*min is '1000'*/ }, true, 'TTLExceeded');
  });

  it("A child process is started, but it is then forcibly killed while running. The parent process proceeds with its locking operation only after confirming that the lock information has been invalidated.", async () => {
    const key = 'subKey0031';
    const child = await execChild('lock', { key, sleep: 1000, ttlMs: 1100, heartbeatTtlMs: 5000, waitAquired: true });
    child.cid.kill();
    const pp = FileLock.withLock(key, async () => {
        await sleepAsync(500);
        return 'completed'
      },
      { timeoutMs: 5500, heartbeatTtlMs: 5000}
    );

    const results = await Promise.allSettled([child.promise, pp]);

    // One of them has resulted in a timeout error (AlreadyLocked).
    expect(results[0]).toMatchObject({
      status: 'rejected',
      //reason: "child failed: code=null signal=SIGTERM msg=" 子プロセスの理由は問わない！！
    });
    expect(results[1]).toMatchObject({
      status: 'fulfilled',
      value: 'completed'
    });

    // 子プロセスは完了していない
    expect(childCompeleted()).toBeFalsy();
  });

  it("Using the same key, the parent process is started first; however, the parent's lock file expires, allowing the child process to overwrite the lock file, acquire the lock, and complete its task.", async () => {
    
    const key = 'keyParentStale001';
    const parentPr = FileLock.withLock(key, async () => {
      const meta = getLockMeta(key);
      const t = Date.now() - 5500;
      meta["expiresAt"] = t;
      meta["heartbeatExpiresAt"] = t;
      setLockMeta(key, meta);
      await sleepAsync(4000);
      return 'completed'
    }, {
      timeoutMs: 1000, ttlMs: 5000, heartbeatTtlMs: 5000
    });

    const child = await execChild('lock', { key, sleep: 450, ttlMs: 1500, timeOutMs: 5000, waitAquired: true });
    const results = await Promise.allSettled([child.promise, parentPr]);
    // The result of child.
    expect(results[0]).toMatchObject({ status: 'fulfilled'/*, value: 'completed'*/ });
    // The result of parent.
    expect('reason' in results[1] && results[1].reason instanceof ReleaseFailed).toBeTruthy();
    expect(results[1]).toMatchObject({
      status: 'rejected',
      reason: {
        code: "ERELEASE",
        key,
        message: "Processing is interrupted because the lock release or lock counter decrement failed."
      }
    });
    expect(TestLock.isReleasedState(key)).toBeTruthy();
  });

  it("Using the same key, the child process is started first; then the parent attempts to acquire the lock (with a timeout of 0 and re-entry enabled) — resulting in a timeout error.", async () => {
    const key = 'rentryAlreadyLocked';
    const child = await execChild('lock', { key, sleep: 1000, ttlMs: 2000, timeOutMs: 0, waitAquired: true });
    const parentPr = FileLock.withLock(key, () => {
      return 'completed'
    }, {
      timeoutMs: 0,
      allowReentry: true,
    });
    const results = await Promise.allSettled([child.promise, parentPr]);
    // The result of child.
    expect(results[0]).toMatchObject({ status: 'fulfilled'/*, value: 'completed'*/ });
    // The result of parent.
    expect('reason' in results[1] && results[1].reason instanceof AlreadyLocked).toBeTruthy();
    expect(results[1]).toMatchObject({
      status: 'rejected',
      reason: {
        code: "EALREADYLOCKED",
        key,
        message: "The `lock file` already exists."
      }
    });
    expect(TestLock.isReleasedState(key)).toBeTruthy();
  });

});
