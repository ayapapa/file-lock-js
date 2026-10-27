import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sleepAsync, getLockMeta, setLockMeta, removeLockFiles, getLockMetaPath, TestLock  } from './FileLockTestCommon.ts';
import { AlreadyLocked, FileLock, type FileLockConfig, } from '../src/index.ts';

let orgConfig: FileLockConfig;
beforeEach(() => {
  vi.restoreAllMocks();
  orgConfig = FileLock.getConfig();
});

afterEach(() => {
  vi.restoreAllMocks();
  FileLock.setConfig(orgConfig);
});

describe('FileLock', () => {

  async function testInvalidLockInformationFile(target: string, v?: unknown ) {
    const key = "testKey";
    const meta = {ownerId: "hoge", counter: 1, expiresAt: Date.now() + 10*1000/*, heartbeatTtlMs:5000*/, heartbeatExpiresAt: Date.now()};
    const mt = {...meta} as Record<string, unknown>;
    if (v) {
      mt[target] = v;
    } else {
      delete mt[target];
    }
    setLockMeta(key, mt);
    try {
      await FileLock.withLock(
        key,
        async () => await sleepAsync(100),
        { timeoutMs: 0 }// ttlMs: 1000 }
      );
    } catch (err) {
      expect(err).instanceOf(AlreadyLocked);
      const invalidProps = {} as Record<string, unknown>;
      invalidProps[target] = mt[target];

      const matchObj = {
        code: "EALREADYLOCKED",
        key,
        reason: "InvalidMetadata",
        message: "The `lock file` already exists, but its metadata is invalid.",
        causes: [{
          code: "ECOMPROMISED",
          key,
          invalidProps,
          path: getLockMetaPath(key),
          reason: "The lock information format is invalid.",
          message: "The lock was compromised during the locking process.",
        }],
      }
      expect(err).toMatchObject(matchObj);
    }
    finally {
      removeLockFiles(key);
    }
    expect(TestLock.isReleasedState(key)).toBeTruthy();

  }

  it("Spoof the invalid lock information storage file and verify that an error occurs.(No ownerId)", async () => {
    await testInvalidLockInformationFile("ownerId");
  });

  /*
  it("Spoof the invalid lock information storage file and verify that an error occurs.(No counter)", async () => {
    await testInvalidLockInformationFile("counter");
  });
*/
  it("Spoof the invalid lock information storage file and verify that an error occurs.(No expiresAt)", async () => {
    await testInvalidLockInformationFile("expiresAt");
  });

/*
  it("Spoof the invalid lock information storage file and verify that an error occurs.(No heartbeatTtlMs)", async () => {
    await testInvalidLockInformationFile("heartbeatTtlMs");
  });
*/
  it("Spoof the invalid lock information storage file and verify that an error occurs.(Invalid ownerId)", async () => {
    await testInvalidLockInformationFile("ownerId", 12345);
  });
/*
  it("Spoof the invalid lock information storage file and verify that an error occurs.(Invalid counter)", async () => {
    await testInvalidLockInformationFile("counter", 'hogehogehoge');
  });
*/
  it("Spoof the invalid lock information storage file and verify that an error occurs.(Invalid expiresAt)", async () => {
    await testInvalidLockInformationFile("expiresAt", "nyannnyann");
  });
/*
  it("Spoof the invalid lock information storage file and verify that an error occurs.(Invalid heartbeatTtlMs)", async () => {
    await testInvalidLockInformationFile("heartbeatTtlMs", "miimii");
  });
*/
  it("Verify that the heartbeat is functioning correctly.", async () => {
    const key = "testKey", retVal = key;
    let resolveCallbackEntered!: () => void;
    const callbackEntered = new Promise<void>(resolve => {
      resolveCallbackEntered = resolve;
    });
    let resolveCallback!: () => void;
    const callbackGate = new Promise<void>(resolve => {
      resolveCallback = resolve;
    });

    vi.useFakeTimers();
    const lockPromise = FileLock.withLock(
      key,
      async () => {
        resolveCallbackEntered();
        await callbackGate;
        return retVal;
      },
      { ttlMs: 3000 }
    );

    try {
      await callbackEntered;
      const metaBefore = getLockMeta(key);
      await vi.advanceTimersByTimeAsync(1000);
      const metaAfter = getLockMeta(key);
      expect(metaAfter.heartbeatExpiresAt).toBeGreaterThan(metaBefore.heartbeatExpiresAt);

      resolveCallback();
      expect(await lockPromise).toBe(retVal);
      expect(TestLock.isReleasedState(key)).toBeTruthy();
    }
    finally {
      resolveCallback();
      vi.useRealTimers();
      removeLockFiles(key);
    }
  });

  it("Stops retrying a heartbeat update after the lock is released.", async () => {
    const key = `heartbeatRetryAfterRelease_${Date.now()}`;
    const tmpPath = getLockMetaPath(key) + '.tmp';
    const originalOpenSync = fs.openSync;
    let heartbeatOpenAttempts = 0;
    let resolveHeartbeatAttempt!: () => void;
    const heartbeatAttempt = new Promise<void>(resolve => {
      resolveHeartbeatAttempt = resolve;
    });
    let resolveCallbackEntered!: () => void;
    const callbackEntered = new Promise<void>(resolve => {
      resolveCallbackEntered = resolve;
    });

    vi.useFakeTimers();
    const openSpy = vi.spyOn(fs, 'openSync').mockImplementation((filePath, flags, mode) => {
      if (filePath === tmpPath && new Error().stack?.includes('#updateHeartbeat')) {
        heartbeatOpenAttempts++;
        resolveHeartbeatAttempt();
        throw Object.assign(new Error('Temporary lock file is busy.'), { code: 'EEXIST' });
      }
      return originalOpenSync(filePath, flags, mode);
    });

    try {
      const lockPromise = FileLock.withLock(
        key,
        async () => {
          resolveCallbackEntered();
          await heartbeatAttempt;
          return key;
        },
        { timeoutMs: 0, ttlMs: 10000 }
      );

      await callbackEntered;
      await vi.advanceTimersByTimeAsync(1000);
      await expect(lockPromise).resolves.toBe(key);

      // Let the pending retry observe that releasing the lock stopped its heartbeat timer.
      await vi.advanceTimersByTimeAsync(3000);

      expect(heartbeatOpenAttempts).toBe(1);
      expect(TestLock.isReleasedState(key)).toBeTruthy();
    }
    finally {
      resolveHeartbeatAttempt();
      openSpy.mockRestore();
      vi.useRealTimers();
      removeLockFiles(key);
    }
  });
});
