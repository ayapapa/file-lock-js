import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger, sleepAsync,  removeLockFiles, TestLock, setLockMeta, getLockMetaPath  } from './FileLockTestCommon.ts';
import { AlreadyLocked, type FileLockConfig, FileLock, } from '../src/index.ts';
import { randomUUID } from 'node:crypto';

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
  it("If `expiresAt` is a past value and heartbeat is enabled, the lock cannot be acquired.", async () => {
    const key = String(randomUUID());
    const meta = {ownerId: "hoge", counter: 1, expiresAt: Date.now() - 1000, eartbeatExpiresAt: Date.now() + 5000};
    setLockMeta(key, meta);

    expect.assertions(2);
    try {
      await FileLock.withLock(
        key,
        async () => {
          await sleepAsync(1000);
        },
        {timeoutMs: 1000}
      );
    }
    catch (err) {
      expect(err).instanceOf(AlreadyLocked);
    }
    finally {
      try { removeLockFiles(key); } catch (_e) {;};
    }
    expect(TestLock.isReleasedState(key)).toBeTruthy();
  });

  it("If `expiresAt` is valid but heartbeat is disabled, the lock cannot be acquired.", async () => {
    const key = String(randomUUID());
    const meta = {ownerId: "hoge", counter: 1, expiresAt: Date.now() + 5000, heartbeatTtlMs:1000, heartbeatExpiresAt: Date.now() - 2000};
    setLockMeta(key, meta);

    expect.assertions(2);
    try {
      await FileLock.withLock(
        key,
        async () => {
          await sleepAsync(1000);
        },
        {timeoutMs: 1000}
      );
    }
    catch (err) {
      expect(err instanceof AlreadyLocked).toBe(true);
    }
    finally {
      try { removeLockFiles(key); } catch (_e) {;};
    }
    expect(TestLock.isReleasedState(key)).toBeTruthy();
  });

  it("If both `expiresAt` and the heartbeat are disabled, the lock can be acquired.", async () => {
    const key = String(randomUUID());
    const meta = {ownerId: "hoge", counter: 1, expiresAt: Date.now() - 2000, heartbeatTtlMs:1000, heartbeatExpiresAt: Date.now() - 2000};
    setLockMeta(key, meta);

    expect.assertions(2);
    try {
      const ret = await FileLock.withLock(
        key,
        async () => {
          await sleepAsync(1000);
          return key;
        },
        {timeoutMs: 1000}
      );
      expect(ret).toBe(key);
    }
    catch (err) {
      logger.error(err);
    }
    finally {
      try { removeLockFiles(key); } catch (_e) {;};
    }
    expect(TestLock.isReleasedState(key)).toBeTruthy();
  });

  it("Intentionally create an invalid lock file and verify that a lock attempt succeeds after `invalidTtlMs` has elapsed.", async () => {
    const key = "invald_loclfile_error";
    const meta = {};
    setLockMeta(key, meta);
    const d = new Date(Date.now() - 5000);
    fs.utimesSync(getLockMetaPath(key), d, d);
    expect.assertions(2);
    try {
      expect(await FileLock.withLock(key, () => "completed", { heartbeatTtlMs: 5000/*min*/, timeoutMs: 5500, invalidTtlMs: 5100/*min+100*/ })).toBe("completed")
    }
    finally {
      try { removeLockFiles(key); } catch (_e) {;};
    }
    expect(TestLock.isReleasedState(key)).toBeTruthy();
  });

  it("Invalid lock file → `statSync` returns `undefined` → the invalid file is deemed ineffective → lock is successfully established.", async () => {
    const key = "testKey_invalidMeta_statSyncUndefined_lockOK";
    const meta = {};
    setLockMeta(key, meta);
    const path = getLockMetaPath(key);
    const statSync = fs.statSync;
    const spy = vi.spyOn(fs, 'statSync').mockImplementation(p => {
      if (p === path) {
        return undefined;
      }
      return statSync(path);
    });
    expect.assertions(2);
    try {
      expect(await FileLock.withLock(key, () => "completed", { heartbeatTtlMs: 2000, timeoutMs: 2500, invalidTtlMs: 2000 })).toBe("completed")
    }
    finally {
      spy.mockRestore();
      try { removeLockFiles(key); } catch (_e) {;};
    }
    expect(TestLock.isReleasedState(key)).toBeTruthy();
  });

});
