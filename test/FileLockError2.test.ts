import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getHistoryPath,  getLockMetaPath, getLockSharerDir, removeLockFiles, setLockMeta, sleepAsync, TestLock  } from './FileLockTestCommon.ts';
import { AlreadyLocked, type FileLockConfig,  FileLock, FileLockError, ReleaseFailed, type LockMonitor, type FileLockOptions } from '../src/index.ts';



let orgConfig: FileLockConfig;
beforeEach(() => {
  vi.restoreAllMocks();
  orgConfig = FileLock.getConfig();
});

afterEach(() => {
  vi.restoreAllMocks();
  FileLock.setConfig(orgConfig);
});

describe('FileLockError2', () => {

  it("Residual lock file causing JSON error.", async () => {
    const key = "BadJsonLockFile";
    fs.writeFileSync(getLockMetaPath(key), '()', 'utf-8');
    expect.assertions(3);
    try {
      await FileLock.withLock(key, () => {}, { timeoutMs: 0 });
    }
    catch (err) {
      expect(err).instanceOf(AlreadyLocked);
      expect(err).toMatchObject({
        code: "EALREADYLOCKED",
        key,
        message: "The `lock file` already exists, but its metadata is invalid.",
        reason: "InvalidMetadata",
        causes: [{
          contents: '()',
          key,
          message: "The lock was compromised during the locking process.",
          path: getLockMetaPath(key),
        }]
      })
    }
    finally {
      vi.restoreAllMocks();
      fs.unlinkSync(getLockMetaPath(key));
      expect(TestLock.isReleasedState(key)).toBeTruthy();
    }
  });

  async function testWriteAndUnlinkError(key: string, timeoutMs: number, ErrorClass: new(...args: any[]) => Error, matchObj: object) {
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => { 
      throw Object.assign(new Error("writeFileSync error!"), { code: 'EWMOON' }); });
    const unlinkSpy = vi.spyOn(fs, 'unlinkSync').mockImplementation(() => { throw Object.assign(new Error("unlinkSync error!"), { code: 'EUNLINK' }); });
    expect.assertions(3);
    try {
      await FileLock.withLock(
        key,
        () => {},
        { timeoutMs }
      );
    }
    catch (err) {
      expect(err).instanceOf(ErrorClass);
      expect(err).toMatchObject(matchObj);
    }
    finally {
      writeSpy.mockRestore();
      unlinkSpy.mockRestore();
      vi.restoreAllMocks();

      // There is an incomplete file left behind, so I will delete it.
      const filePath = getLockMetaPath(key);
      const tmpPath = filePath + '.tmp';

      // In Node 22, `rmSync` appears to call `unlinkSync`, so there is a possibility that lock files might be left behind.
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      catch(_err) {;};
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      }
      catch(_err) {;};
    }
    expect(TestLock.isReleasedState(key)).toBeTruthy();
  }

  it("The generation (writing) of the `lock file` fails when the preliminary lock is not held, " +
     "and the subsequent attempt to delete the empty file also fails.(FileLockError)", async () => {
    const key = 'testKey_18465xx_unlink'
    await testWriteAndUnlinkError(key, 50, FileLockError, {
      code: "EIO",
      message: "Failed to acquire the lock due to a file I/O error.",
      key,
    });
  });

  it("The generation (writing) of the `lock file` fails when the preliminary lock is not held, " +
     "and the subsequent attempt to delete the empty file also fails.(AlreadyLocked)", async () => {
    const key = 'testKey_18465xx_unlink_AlreadyLocked'
    await testWriteAndUnlinkError(key, 500, AlreadyLocked, {
      code: "EALREADYLOCKED",
      message: "The `lock file` already exists and may still be updating.",
      reason: "Updating",
      key,
    });
  });

  it("existsSync error occurred during trying lock.", async () => {
    const key = 'testKey_existsSync_error'
    const spy = vi.spyOn(fs, 'existsSync').mockImplementation(() => {
      throw Object.assign(new Error("existsSync test error!!"),  { code: 'EEXISTSYNC' });
    });

    try {
      await FileLock.withLock(
        key,
        async () => {
          await sleepAsync(100);
          return 'completed';
        },
        { timeoutMs: 150 }
      )
    }
    catch (err) {
      expect(err).instanceOf(FileLockError);
      expect(err).toMatchObject({
        code: "EIO",
        key,
        message: "Failed to acquire the lock due to a file I/O error.",
      });
    }
    finally {
      spy.mockRestore();
      try { removeLockFiles(key)} catch (_e) {;};
    }
    expect(TestLock.isReleasedState(key)).toBeTruthy();
  });

  it("If the metafile is eroded while executing the callback function after acquiring the lock, its analysis will fail.", async () => {
    const key = 'testKey_18465xx'
    expect.assertions(4);
    const metaPath = getLockMetaPath(key);
    try {
      await FileLock.withLock(
        key,
        async () => {
          fs.writeFileSync(metaPath, '');
          await sleepAsync(1100);
          await sleepAsync(100);
        }
      );
    }
    catch (err) {
      expect(err).instanceOf(ReleaseFailed);
      expect(err).toMatchObject( {
        code: "ERELEASE",
        key,
        message: "Processing is interrupted because the lock release or lock counter decrement failed.",
      });
      expect(fs.existsSync(metaPath)).toBeTruthy();
    }
    finally {
      removeLockFiles(key);
    }
    expect(TestLock.isReleasedState(key)).toBeTruthy();
  });

  it("If a corrupted metafile is encountered, it is possible that the file is still being created; " +
     "consequently, repeated retries should eventually result in a timeout error.", async () => {
    const key = 'testKey_18465xx'

    const metaPath = getLockMetaPath(key);
    fs.writeFileSync(metaPath, '');
    expect.assertions(3);
    try {
      await FileLock.withLock(
        key,
        async () => {
          await sleepAsync(100);
        },
        { timeoutMs: 150 }
      );
    }
    catch (err) {
      expect(err).instanceOf(AlreadyLocked);
      expect(err).toMatchObject({
        code: "EALREADYLOCKED",
        message: "The `lock file` already exists and may still be initializing.",
        key,
        reason: "Initializing",
      });
    }
    finally {
      removeLockFiles(key);
    }
    expect(TestLock.isReleasedState(key)).toBeTruthy();
  });

  it("history JSON parsing error", async () => {
    const histPath = getHistoryPath();
    const key = 'testKey_18465xxxx'
    const histBu = histPath + '.bu';
    const histExist = fs.existsSync(histPath);

    if (histExist) fs.renameSync(histPath, histBu);
    
    fs.writeFileSync(histPath, '()');

    FileLock.setConfig({ history: true });
    
    expect.assertions(3);
    try {
      await FileLock.withLock(
        key,
        async () => {
          await sleepAsync(100);
        },
        { timeoutMs: 0 }
      );
    }
    catch (err) {
      expect(err).instanceOf(FileLockError);
      const cause = {
        code: "EHISTORY",
        history: histPath,
        message: "Failed to parse the history file.",
      }
      expect(err).toMatchObject({
        code: "EHISTORY",
        message: "Failed to acquire the lock due to history parsing failure.",
        causes: [cause/*, cause*/],
      });
    }
    finally {
      fs.rmSync(histPath);
      if (histExist) fs.renameSync(histBu, histPath);
    }
    expect(TestLock.isReleasedState(key)).toBeTruthy();
  });

  // FileLock.onExit
  it("FileLock.onExit", async () => {
    const key = 'OnExitTest';
    let mon: LockMonitor = { cancelled: false };
    expect.assertions(3);
    try {
      await FileLock.withLock(key, async monitor => {
        mon = monitor;
        await sleepAsync(200);
        FileLock.onExit(2, 'SIGTERM');
        },
        {}
      );
    }
    catch (err) {
      expect(err).toMatchObject({
        code: "ETERM",
        reason: {
          code: 2,
          signal: "SIGTERM",
        },
        message: "Forced termination."
      });
      expect(mon).toMatchObject({
        cancelled: true,
        reason: "ETERM",
        cause: {
          code: "ETERM",
          reason: {
            code: 2,
            signal: "SIGTERM",
          },
        },
        operation: "Callback or Timer in withLock().",
      })
    }
    expect(TestLock.isReleasedState(key)).toBeTruthy();
  });

  // A test that intentionally creates an invalid lock file to deliberately trigger a file I/O error.
  async function testSpyIO(
    key: string, 
    targetFn: 'openSync' | 'readFileSync' | 'existsSync' | 'unlinkSync' | 'writeFileSync' |'readdirSync' | 'rmSync' | 'statSync', 
    spyCb: (counter: number, args: unknown[], orgFn: (...args: unknown[]) => unknown) => unknown, 
    sucsess: boolean, 
    ErrClass: unknown, 
    matchObj: object,
    sweep = false,
    meta: Record<string, unknown> | null = {ownerId: "hoge", expiresAt: Date.now() - 100, heartbeatExpiresAt: Date.now() - 100},
    options?: FileLockOptions,
    sleep: number = 100
    ) {

    if (meta) setLockMeta(key, meta);

    let counter = 0;

    const original = fs[targetFn] as (...args: unknown[]) => unknown;

    const spy = vi.spyOn(fs, targetFn).mockImplementation((...args: unknown[]) => {
      counter++;
      return spyCb(counter, args, original);
    });

    const asCounts = (sucsess ? 1 : 2) + 1;
    expect.assertions(asCounts);
    const ret = "completed."
    try {
      expect(await FileLock.withLock(
        key, 
        async () => {
          await sleepAsync(sleep);
          return ret;
        },
        Object.assign({ timeoutMs: 0 }, options), // Set to 0ms to ensure zero retries for lock acquisition
      )).toBe(ret);
    }
    catch (err) {
      expect(err).instanceOf(ErrClass);
      expect(err).toMatchObject(matchObj);
    }
    finally {
      spy.mockRestore()
      if (sweep) try { removeLockFiles(key) } catch (_e) {;};
    }
    expect(TestLock.isReleasedState(key)).toBeTruthy();
  }

  it("When an invalid `lock file` exists, an exclusive open attempt fails after the file is deleted. A subsequent lock succeeds.", async () => {
    const key = "testKey_staleMeta_reopenFailed_lockOK";
    await testSpyIO(
      key,
      'openSync',
      (counter, args, orgFn) => {
        if (counter === 2) throw Object.assign(new Error("#####"), { code: "EEXIST"});
        return orgFn(...args);
      },
      true, 
      null,
      {}
    );
  });
  
  it("An invalid `lock file` exists; the initial attempt to open exclusively failed, determin that it is invalid; " +
     "a subsequent attempt to open the temporary `lock file` exclusively also failed; consequently, the locking operation fails..", async () => {
    const key = "testKey_staleMeta_reopenFailed_lockNg"
    await testSpyIO(
      key,
      'openSync',
      (counter, args, orgFn) => {
        if (counter >= 2) throw Object.assign(new Error("#####"), { code: "EEXIST"});
        return orgFn(...args);
      },
      false, 
      FileLockError,
      {
        code: "EIO",
        key,
        message: "Failed to acquire the lock due to a file I/O error.",
      }
    );
  });

  it("Failed to delete an invalid `lock file`, but subsequently succeeded in acquiring the lock.", async () => {
    const key = "testKey_staleMeta_unlinkFailed_lockOK";

    await testSpyIO(
      key,
      'unlinkSync',
      (counter, args, orgFn) => {
        if (counter === 1) throw Object.assign(new Error("#####"), { code: "EEXIST"});
        return orgFn(...args);
      },
      true, 
      AlreadyLocked,
      {
        code: "EALREADYLOCKED",
        path: getLockMetaPath(key),
        key: key,
        message: `Couldn't the lock because the '${key}' is already locked.`
      }
    );
  });

   it("Lock failure for shared lock directory (due to I/O error)", async () => {
    const key = "testKey_sharer_lock";
    await testSpyIO(
      key,
      'openSync',
      (_, args, orgFn) => {
        const filePath = args[0] as string;
        const parent = path.basename(path.dirname(filePath))
        const name = path.basename(filePath)
        if (parent.endsWith('.sharer') && name === '.lock') {
          throw Object.assign(new Error("openSync error!"), { code: 'EOMOON' });
        }
        return orgFn(...args);
      },
      false, // error
      FileLockError,
      {
        code: 'EIO',
        message: "Failed to acquire the lock due to a file I/O error.",
        key,
        causes: [{
          code: 'EIO',
          key,
          message: "Failed to add the lock request to `lock sharer directory`.",
          causes: [{
            code: "EOMOON",
            path: path.join(getLockSharerDir(key), ".lock"),
            message: "Couldn't create the file.(openSync error!)",
          }]
        }],
      },
      false, // sweep
      null,
    );

  });

  it("Failed to delete lock sharer (failed to delete .lock file)", async () => {
    const key = 'lock_sharer_remove_fail';
    await testSpyIO(
      key,
      'rmSync',
      (_, args, orgFn) => {
        const filePath = args[0] as string;
        const parent = path.basename(path.dirname(filePath))
        const name = path.basename(filePath)
        if (parent.endsWith('.sharer') && name === '.lock') {
          throw Object.assign(new Error("rmSync error!"), { code: 'ERMMOON' });
        }
        return orgFn(...args);
      },
      false, // error
      FileLockError,
      {
        code: "EIO",
        key,
        message: "Failed to acquire the lock due to a file I/O error.",
        causes: [{
          code: "EIO",
          key,
          message: "Failed to add the lock request to `lock sharer directory`.",
          causes: [{
            code: "ERMMOON",
            path: path.join(getLockSharerDir(key), '.lock'),
            message: "Couldn't remove the file or directory.(rmSync error!)",
            causes: [
              { code: "ERMMOON", message: "rmSync error!" },
            ]
          }],
        }],
      },
      true, // sweep
      null,
    );

  });

  it("Failed to retrieve the list of lock sharers.", async () => {
    const key = 'Key_readdirSyncErr';
    const targetPath: string = getLockSharerDir(key);
    const cause2 = {
      code: 'ERDMOON',
      path: targetPath,
      message: "Couldn't read the direcroty.(readdirSync error)",
    };
    const cause = {
          code: 'EIO',
          key,
          sharerDir: targetPath,
          message: "Failed to count the `lock sharer`.",
          causes: [cause2]
    };

    await testSpyIO(
      key,
      'readdirSync',
      (_, args, orgFn) => {
        if (targetPath === args[0]) {
          throw Object.assign(new Error('readdirSync error'), { code: 'ERDMOON' });
        }
        return orgFn(...args);
      },
      false, // error
      ReleaseFailed,
      {
        code: "ERELEASE",
        key,
        message: "Processing is interrupted because the lock release or lock counter decrement failed.",
        causes: [cause]
      },
      true, // sweep
      null,
    );
  });

  //removeSharer unlinkSync
  it("Error deleting lock sharer.", async () => {
    const key = 'Key_unlinkSyncErr';
    const targetDir: string = getLockSharerDir(key);

    const cause2 = {
      code: 'EULMOON',
      message: "Couldn't remove the file.(unlinkSync error)",
    };
    const cause = {
          code: 'EIO',
          key,
          message: "Failed to remove the lock request from the `lock sharer`.",
          causes: [cause2]
    };

    await testSpyIO(
      key,
      'unlinkSync',
      (_, args, orgFn) => {
        if (String(args[0]).includes(targetDir) === true && String(args[0]).endsWith('.lock') === false) {
          throw Object.assign(new Error('unlinkSync error'), { code: 'EULMOON' });
        }
        return orgFn(...args);
      },
      false, // error
      ReleaseFailed,
      {
        code: "ERELEASE",
        key,
        message: "Processing is interrupted because the lock release or lock counter decrement failed.",
        causes: [cause]
      },
      true, // sweep
      null,
    );
  });

  it("Falsely claiming that a lock file does not exist when it actually does.", async () => {
    const key = 'Key_existsSync_false';
    const targetPath = getLockMetaPath(key);

    await testSpyIO(
      key,
      'existsSync',
      (_, args, orgFn) => {
        if (String(args[0]) == targetPath) return false;
        return orgFn(...args);
      },
      false, // error
      AlreadyLocked,
      {
        code: "EALREADYLOCKED",
        key,
        reason: "MetadataReadError",
        message: "The `lock file` already exists, but its validity could not be determined due to an I/O error.",
        causes:["ENOENT"],
      },
      true, // sweep
    );

  });

  it("An exclusive open operation fails because a lock file from a previous step exists; however, when I check for the file's existence, I am told that it does not exist.", async () => {
    const key = 'Key_existsSync_false';
    const targetPath = getLockMetaPath(key);

    await testSpyIO(
      key,
      'existsSync',
      (_, args, orgFn) => {
        if (String(args[0]) == targetPath) return false;
        return orgFn(...args);
      },
      false, 
      AlreadyLocked,
      {
        code: "EALREADYLOCKED",
        key,
        reason: "MetadataReadError",
        message: "The `lock file` already exists, but its validity could not be determined due to an I/O error.",
      },
      true,
      {ownerId: "hoge", expiresAt: Date.now(), heartbeatExpiresAt: Date.now() - 3000},
    );
  });

  it("Circular deadlock. The one that did not time out first succeeds.", async () => {
    const key1 = "testKey_circular_deadlock_001";
    const key2 = "testKey_circular_deadlock_002";
    const p1 = FileLock.withLock(key1, async () => {
      await FileLock.withLock(key2, async () => {
        },
        { timeoutMs: 100 }
      );
      return 'completed.'
    })
    const p2 = FileLock.withLock(key2, async () => {
      await FileLock.withLock(key1, () => {}, { timeoutMs: 100 });
      return 'completed.'
    })

    const results = await Promise.allSettled([p1, p2]);

    // One of them has resulted in a timeout error (AlreadyLocked).
    expect(results[0].status === 'rejected' || results[1].status === 'rejected').toBeTruthy();
    for(const r of results) {
      if (r.status === 'fulfilled') expect(r.value).toBe('completed.');
      else                          expect(r.reason).instanceOf(AlreadyLocked);
    }
    expect(TestLock.isReleasedState(key1)).toBeTruthy();
    expect(TestLock.isReleasedState(key2)).toBeTruthy();
  });


it("Deliberately create an invalid lock file and verify that it results in an error.", async () => {
    const key = "invalid_locklfile_error";
    const meta = {};
    setLockMeta(key, meta);
    expect.assertions(3);
    try {
      await FileLock.withLock(key, () => {}, { /*heartbeatTtlMs: 200, */timeoutMs: 300 });
    }
    catch (err) {
      expect(err).instanceOf(AlreadyLocked);
      expect(err).toMatchObject({
        code: "EALREADYLOCKED",
        key,
        reason: "InvalidMetadata",
        message: "The `lock file` already exists, but its metadata is invalid."
      });
    }
    finally {
      removeLockFiles(key);
      expect(TestLock.isReleasedState(key)).toBeTruthy();
    }
  });


  // Proceed by simulating the creation of a 'tmp' file (i.e., attempting to create it, failing to do so, but without triggering an explicit error).
  // This should lead to a 'tmp' file write error, ultimately resulting in a failure to acquire the lock.
  // Then, verify that everything—including the 'tmp' file—is left in a clean state.
  it("Falsely claim that a temporary lock file has been created", async() => {
    const key = "fakeTmpCreation";
    const openSync = fs.openSync as (...args: unknown[]) => number;
    const dummyFd = -18465;
    const openSpy = vi.spyOn(fs, 'openSync').mockImplementation((...args: unknown[]): number => {
      if (args[0] === getLockMetaPath(key) + '.tmp') {
        return dummyFd; // Return an appropriate value without opening
      }
      return openSync(...args);
    });
    const closeSync = fs.closeSync;
    const closeSpy = vi.spyOn(fs, 'closeSync').mockImplementation((...args: unknown[]): void => {
      if (args[0] === dummyFd) {
        return;
      }
      closeSync(args[0] as number);
    });

    try {
      await FileLock.withLock(key, () => {}, { timeoutMs: 0});
    }
    catch (err) {
      expect(err).instanceOf(FileLockError);
      expect(err).toMatchObject({
        code: "EIO",
        key,
        message: "Failed to acquire the lock due to a file I/O error.",
        causes: [{
          code: "ENOENT",
          key,
          message: "[REQUIRE] Not found the `temporary lock file`."
        }],
      });
    }
    finally {
      openSpy.mockRestore();
      closeSpy.mockRestore();
    }
    expect(TestLock.isReleasedState(key)).toBeTruthy();
  });

  // Proceed by simulating the creation of a 'tmp' file (i.e., an attempt to create it is made, but it fails without triggering an explicit error).
  // This should lead to a 'tmp' file write error, ultimately resulting in a failure to acquire the lock.
  // Next, force `rmSync` to fail as well, ensuring that an empty lock file remains behind.
  // Finally, perform a forced deletion to conclude the test.
  it("Falsely claim that a temporary lock file has been created(remain 'lock file` related)", async() => {
    const key = "fakeTmpCreationAndRmError";
    const openSync = fs.openSync as (...args: unknown[]) => number;
    const dummyFd = -18465;
    const path = getLockMetaPath(key);
    const openSpy = vi.spyOn(fs, 'openSync').mockImplementation((...args: unknown[]): number => {
      if (args[0] === path + '.tmp') {
        return dummyFd; // Return an appropriate value without opening
      }
      return openSync(...args);
    });
    const closeSync = fs.closeSync;
    const closeSpy = vi.spyOn(fs, 'closeSync').mockImplementation((...args: unknown[]): void => {
      if (args[0] === dummyFd) {
        return;
      }
      closeSync(args[0] as number);
    });
    const rmSpy = vi.spyOn(fs, 'rmSync').mockImplementation(() => { throw Object.assign(new Error("rmSyncError!!"), { code: "ERMMOON" }) });

    expect.assertions(3);
    try {
      await FileLock.withLock(key, () => {}, { timeoutMs: 0});
    }
    catch (err) {
      expect(err).instanceOf(FileLockError);
      expect(err).toMatchObject({
        code: "EIO",
        key,
        message: "Failed to acquire the lock due to a file I/O error.",
        causes: [{
          code: "ERMMOON",
          path: path,
          message: "Failed to remove the `lock file`(rmSyncError!!)",
          causes: [{
            code: "ERMMOON",
            message: "rmSyncError!!",
          }]
        }],
      });
    }
    finally {
      openSpy.mockRestore();
      closeSpy.mockRestore();
      rmSpy.mockRestore();

      try { removeLockFiles(key); } catch (_e) {;}
    }
    expect(TestLock.isReleasedState(key)).toBeTruthy();
  });

  it("Failed to create temporary lock file (during locking)", async () => {
    const key = "createTmpFailed";
    await testSpyIO(
      key,
      'openSync',
      () => {
        throw Object.assign(new Error("openSync error!"), { code: 'EOMOON' });
      },
      false, // error
      FileLockError,
      {
        code: 'EIO',
        message: "Failed to acquire the lock due to a file I/O error.",
        key,
        causes: [{
          code: "EOMOON",
          path: getLockMetaPath(key) + '.tmp',
          message: "Couldn't create the file.(openSync error!)",
          causes: [{
            code: "EOMOON",
            message: "openSync error!",
          }]
        }],
      },
      false, // sweep
      null,
    );
  });

  it("A temporary lock file error with code ERMTEMP is reported as an I/O lock failure.", async () => {
    const key = "temporaryLockFileError";
    await testSpyIO(
      key,
      'writeFileSync',
      (_, args, orgFn) => {
        if (args[0] === getLockMetaPath(key) + '.tmp') {
          throw Object.assign(new Error("temporary file error!"), { code: 'ERMTEMP' });
        }
        return orgFn(...args);
      },
      false, // error
      FileLockError,
      {
        code: 'EIO',
        key,
        message: "Failed to acquire the lock due to a file I/O error.",
        causes: [{
          code: 'ERMTEMP',
          path: getLockMetaPath(key) + '.tmp',
          message: "Failed to write the `temporary lock file`.(temporary file error!)",
        }],
      },
      true, // sweep
      null,
    );
  });

  it("Failed to create temporary lock file (during heartbeat update)", async () => {
    const key = "createTmpFailedHeatbeat";
    await testSpyIO(
      key,
      'openSync',
      (count, args, orgFn) => {
        if (count >= 4) { // The 4th occurrence is the first heartbeat update
          const err = new Error("openSync error!");
          if (err.stack?.includes('#updateHeartbeat'))
            throw Object.assign(err, { code: 'EOMOON' });
          else
            return orgFn(...args);
        }
        else {
          return orgFn(...args);
        }
      },
      true, // success
      null,
      {},
      false, // sweep
      null,
      { timeoutMs: 0 },
      2750 // sleep
    );
  });

  it("Invalid file: statSyncError.", async () => {
    const key = "invalidLockFileStatSyncError";
    await testSpyIO(
      key,
      'statSync',
      (_, args: unknown[], org) => {
        const p = args[0];
        if (p === getLockMetaPath(key)) {
          throw Object.assign(new Error("statiSync error!"), { code: 'ESMOON' });
        }
        else {
          return org(...args);
        }
      },
      false, // error
      FileLockError,
      {
        code: 'EIO',
        message: "Failed to acquire the lock due to a file I/O error.",
        key,
        causes: [{
          code: "ESMOON",
          path: getLockMetaPath(key),
          message: "Couldn't get status of the file.(statiSync error!)",
          causes: [{
            code: "ESMOON",
            message: "statiSync error!",
          }]
        }],
      },
      true, // sweep
      {}, { invalidTtlMs: 0 }
    );
  });

  it("Key containing characters prohibited in filenames.", async () => {
    const key = 'Hoge[<>:/\\*]""';
    expect(await FileLock.withLock(key, () => { return 'complete'; })).toBe('complete');
  });

});
