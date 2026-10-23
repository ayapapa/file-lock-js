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

  it("If `expirationTime` is a past value and heartbeat is enabled, the lock cannot be acquired.", async () => {
    const key = String(randomUUID());
    const meta = {ownerId: "hoge", counter: 1, expirationTime: Date.now() - 1000, heartbeatTtlMs:5000, lastHeartbeatAt: Date.now()};
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

  it("If `expirationTime` is valid but heartbeat is disabled, the lock cannot be acquired.", async () => {
    const key = String(randomUUID());
    const meta = {ownerId: "hoge", counter: 1, expirationTime: Date.now() + 5000, heartbeatTtlMs:1000, lastHeartbeatAt: Date.now() - 2000};
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

  it("If both `expirationTime` and the heartbeat are disabled, the lock can be acquired.", async () => {
    const key = String(randomUUID());
    const meta = {ownerId: "hoge", counter: 1, expirationTime: Date.now() - 2000, heartbeatTtlMs:1000, lastHeartbeatAt: Date.now() - 2000};
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

  it("不正なロックファイルを故意に作成し、`invalidTtlMs`時間後にロック成功することを確認する", async () => {
    const key = "invald_loclfile_error";
    const meta = {};
    setLockMeta(key, meta);
    const d = new Date(Date.now() - 5000); // 過去に設定
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


  // 不正ファイルのstatSyncでundefiendを返す⇒不正ファイルが無効と判定され、正常にロック。
  it("不正ロックファイル⇒statSyncでundefiendを返す⇒不正ファイルが無効と判定され、正常にロック.", async () => {
    // statSyncは、ファイルが無いときには、undefinedを返す。
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



  // ★★★ IOリトライ：sleepAsyncに変えてみるのが先！！！かもしれない。。。


  it("ロック一時ファイルを故意に作成し、`invalidTtlMs`時間後にロック成功することを確認する", async () => {
    // ★★★ IOリトライを、sleepAsyncに変えてみるのが先かもしれない。。。
    // ロック一時ファイルが長期にわたって残っていること自体が不正であるため中味は確認しない。
    // しかし、この期間を決めるのが難しい（最小値は、heartbeatTtlMsで、良いかもしれない）
    // 想定できるのは、、、
    // １）超負荷時になかなかロックファイルへの反映が出来ない。。。これに、２秒とかかかるのは、あきらかにおかしい、、、
    // ２）強制終了。。。これなら、数十秒で削除してもいだろう。。。に、２秒とかかかるのは、あきらかにおかしい、、、
    // となると、、１０秒以上を設定するのが望ましいと思われる。
    // ★★★ しかし、tmpの乗っ取り！が行われることを前提にしないといけない！　
    // 　⇒　ctimeあるいはmtimeを確認し、自分が保存しているそれらと異なっていたら、あるいは、tmpがなかったら、乗っ取られた
    //  ⇒　つまり、その場合は、ロック失敗で、また、ロックをリトライするしかない。このtmpのチェックはtmpアクセス時に必ず実施する軽い関数としよう。
    //  isMyTmp(options): boolean …　軽くって、、、リトライ無し？　statSyncで、ENOENT以外はあきらめで良いよ！
  });

});
