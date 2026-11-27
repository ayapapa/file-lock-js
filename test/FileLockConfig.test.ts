import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PrettyConsole } from '@ayapapa-npm/pretty-console-js';

import {createFileLock, type FileLockConfig, type FileLockOptions, type LogProvider, 
  FileLock, InvalidConfiguration, LockDirectoryCreationFailed, LockDirectoryStatFailed, LockError, QueueManager, 
  defaultQueueManager} from '../src/index.ts';
import { getHistoryPath, getLockMetaPath, logger, sleepAsync, TestLock } from './FileLockTestCommon.ts'
import { AssertionError } from 'node:assert';


type NumberKeys<T> = {
    [K in keyof T]-?: T[K] extends number ? K : never
}[keyof T];

let orgConfig: FileLockConfig;
beforeEach(() => {
  vi.restoreAllMocks();
  orgConfig = FileLock.getConfig();
});

afterEach(() => {
  vi.restoreAllMocks();
  FileLock.setConfig(orgConfig);
});

/*
type ConfigSnapshot = Record<string, unknown>;

type ConfigMethodNames = readonly string[];
*/
/**
 * コンフィグの値と、公開メソッドの存在を検証する。
 */
/*
export function expectConfigObject(
  actual: Record<string, unknown>,
  expectedValues: ConfigSnapshot,
  expectedMethods: ConfigMethodNames = [],
): void {
  // 値系プロパティの比較
  expect(actual).toMatchObject(expectedValues);

  // 操作系メソッドの存在と関数であることを確認
  for (const methodName of expectedMethods) {
    expect(actual).toHaveProperty(methodName);
    expect(actual[methodName]).toEqual(expect.any(Function));
  }
}

export function getValueProperties<T extends object>(
  obj: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, value]) => typeof value !== 'function',
    ),
  ) as Partial<T>;
}

export function getFunctionProperties<T extends object>(
  obj: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, value]) => typeof value === 'function',
    ),
  ) as Partial<T>;
}
*/

export function expectObjectToMatch(
  actual: object,
  expected: object,
  parentPath = '',
): void {
  const actualRecord = actual as Record<string, unknown>;
  const expectedRecord = expected as Record<string, unknown>;

  for (const [key, expectedValue] of Object.entries(expectedRecord)) {
    const path = parentPath ? `${parentPath}.${key}` : key;

    // キーの存在確認
    expect(
      Object.prototype.hasOwnProperty.call(actualRecord, key),
      `Property "${path}" should exist`,
    ).toBe(true);

    const actualValue = actualRecord[key];

    // 関数系：参照や実装は比較しない
    if (typeof expectedValue === 'function') {
      continue;
    }

    // ネストしたオブジェクト：再帰的に比較
    if (
      expectedValue !== null &&
      typeof expectedValue === 'object' &&
      !Array.isArray(expectedValue)
    ) {
      expectObjectToMatch(
        actualValue as object,
        expectedValue,
        path,
      );
      continue;
    }

    // 値系：値を比較
    expect(actualValue, `Property "${path}"`)
      .toEqual(expectedValue);
  }
}

/*
export function expectObjectToMatch(
  actual: object,
  expected: object,
): void {
  const entries = Object.entries(expected);

  // 値系プロパティ
  const expectedValues = Object.fromEntries(
    entries.filter(
      ([, value]) => typeof value !== 'function',
    ),
  );

  // 関数系プロパティ
  const expectedMethods = entries
    .filter(([, value]) => typeof value === 'function')
    .map(([key]) => key);

  // 値の比較
  expect(actual).toMatchObject(expectedValues);

  // メソッドのキーの存在確認
  for (const key of expectedMethods) {
    expect(actual).toHaveProperty(key);
  }
}
*/

/*
export function expectObjectToMatch(
  actual: object,
  expected: object,
): void {
  const entries = Object.entries(expected);

  // 値系プロパティ
  const expectedValues = Object.fromEntries(
    entries.filter(
      ([, value]) => typeof value !== 'function',
    ),
  );

  // 関数系プロパティ
  const expectedMethods = entries
    .filter(([, value]) => typeof value === 'function')
    .map(([key]) => key);

  // 値の比較
  expect(actual).toMatchObject(expectedValues);

  // メソッドのキーの存在確認
  for (const key of expectedMethods) {
    expect(actual).toHaveProperty(key);
  }
}
*/

/*
export function expectObjectToMatch(
  actual: object,
  expected: object,
): void {
  const getEntries = (obj: object) => Object.entries(obj);

  const getValueProperties = (obj: object) =>
    Object.fromEntries(
      getEntries(obj).filter(
        ([, value]) => typeof value !== 'function',
      ),
    );

  const getFunctionProperties = (obj: object) =>
    getEntries(obj).filter(
      ([, value]) => typeof value === 'function',
    );

  // 値系プロパティを比較
  const vp1 = getValueProperties(actual);
  const vp2 = getValueProperties(expected);
  expect(getValueProperties(actual))
    .toMatchObject(getValueProperties(expected));

  // 関数系プロパティの存在と関数型を確認
  for (const [key] of getFunctionProperties(expected)) {
    expect(actual).toHaveProperty(key);
    expect(actual[key as keyof typeof actual])
      .toEqual(expect.any(Function));
  }
}
*/

describe('FileLock.Config', () => {

  it('exports public types', () => {
    expectTypeOf<FileLockConfig>().toEqualTypeOf<{
      logger?: LogProvider;
      _debug?: boolean;
      lockDirectory?: string;
      cache?: boolean;
      maxCacheEntries?: number;
      cacheTtlMs?: number;
      defaultOptions?: FileLockOptions;
      history?: boolean;
      maxHistoryEntries?: number;
      maxHistoryFiles?: number;
      queueManager?: QueueManager | undefined
      //maxConcurrency?: number;
      //maxPending?: number;
      //queue?: boolean;
     }>();
  });

  it("`FileLock.setConfig()` works correctly.", () => {
    //expect.assertions(3);
    FileLock.setConfig(FileLock.defaultConfig);
    expectObjectToMatch(FileLock.getConfig(), FileLock.defaultConfig);
    //expect(FileLock.getConfig()).toMatchObject(FileLock.defaultConfig);
    //const lockDirectory = 'hogehoge';
    let config: FileLockConfig = {...FileLock.defaultConfig, /*lockDirectory, */cache: false, logger: new PrettyConsole() };
    FileLock.setConfig(config);
    const newConf = FileLock.getConfig();
    expectObjectToMatch(newConf, config);
    //expect(newConf).toMatchObject(config);
    config = {...FileLock.defaultConfig, defaultOptions: { ...FileLock.defaultOptions, allowReentry: true } };
    FileLock.setConfig(config);
    expect(JSON.stringify(FileLock.getConfig())).toBe(JSON.stringify(config));
  });

  it("`FileLock.resetConfig()` works correctly.", () => {
    const dummyLogger: LogProvider = {
      log: ()=>{}, info: ()=>{}, trace: ()=>{}, debug: ()=>{}, warn: ()=>{}, error: ()=>{}, fatal: ()=>{}
    }
    FileLock.setConfig({ logger: dummyLogger, _debug: true,  cache: false });
    FileLock.getConfig();
    FileLock.resetConfig();
    expectObjectToMatch(FileLock.getConfig(), FileLock.defaultConfig);
  });

  it("In `setConfig()`, if a value lower than the minimum is specified " +
    "for a numeric property among the default options, " +
    "the minimum value is set.", () => {
      const conf = {
        //maxConcurrency:       -1,
        //maxPending:           -1,
        defaultOptions: {
          timeoutMs:            -1,
          ttlMs:                -1,
          pollIntervalMs:       -1,
          heartbeatIntervalMs:  -1,
          heartbeatTtlMs:       -1,
          retriesOnIoErr:       -1,
          retryIoIntervalMs:    -1,
        }
      }
    const exp = {
      //maxConcurrency:       1,
      //maxPending:           1, // ★★★指定値を超えたときにエラーを考えないとね！！
      defaultOptions: {
        timeoutMs:            0,
        ttlMs:                1000,
        pollIntervalMs:       100,
        heartbeatIntervalMs:  1000,
        heartbeatTtlMs:       5000,
        retriesOnIoErr:       0,
        retryIoIntervalMs:    100,
      }
    };
    // Verify that the default option values ​​in the configuration settings are resolved.
    FileLock.setConfig(conf);
    expectObjectToMatch(FileLock.getConfig(), exp);
  });

/*
  it("`You can specify `console` as the logger, " +
    "and the `fatal` function has been replaced by the `error` function, " +
    "while the `trace` function has been replaced by the `debug` function.", async () => {

    const retVal = "test_logger", key = retVal;
    expect.assertions(3);
    FileLock.setConfig({ logger: console });
    expect(await FileLock.withLock(key, 
      async () => {
        await sleepAsync(500);
        return retVal;
      },
      {}
    )).toBe(retVal);
    const lock = TestLock.getLock(key);
    expect(lock._logger.trace).toBe(lock._logger.debug);
    expect(lock._logger.fatal).toBe(lock._logger.error);
  });
*/
  it("The directory specified in `FileLock.setCondig()` is created.", () => {
    const dir = path.join(process.cwd(), '.lock');
    fs.rmSync(dir, { force: true, recursive: true });
    expect(fs.existsSync(dir)).toBeFalsy();
    const FileLock = createFileLock();
    FileLock.setConfig({ lockDirectory: dir });

    expect(fs.existsSync(dir)).toBeTruthy();
    expect(fs.statSync(dir).isDirectory()).toBeTruthy();
  });

  it("The user has not specified a `lock directory`, and the default lock directory exists as a file.", () => {
    const dir = path.join(process.cwd(), '.lock');
    expect.assertions(2);
    try {
      fs.rmSync(dir, { force: true, recursive: true });
      fs.writeFileSync(dir, "");
      FileLock.setConfig({ lockDirectory: null, logger } as unknown as FileLockConfig);
    }
    catch (err) {
      expect(err).instanceOf(LockDirectoryCreationFailed);
      expect(err).toMatchObject({ code: 'ELOCKDIRCREATE' });
    }
    finally {
      fs.rmSync(dir);
    }
  });

  let count = 0;

  async function testFsErrorBySpyOn(spyOnFnName: 'statSync' | 'mkdirSync', config: FileLockConfig, ErrorClass: new (...args:any[]) => Error): Promise<void>
  {
    const eCode = 'EHOGEHOGE';
    const eMsg = 'Hogehoge error!!';
    const spy = vi.spyOn(fs, spyOnFnName).mockImplementation(() => {
      const err = Object.assign(new Error(eMsg), { code: eCode });
      throw err;
    });
    expect.assertions(3);
    const key = "testFsErrorBySpyOn_"+ String(count++).padStart(2, '0');
    const FileLock = createFileLock();    
    try {
      FileLock.setConfig({ ...config, logger });
      const retVal = key;
      await FileLock.withLock(key, 
        async () => {
          await sleepAsync(500);
          return retVal;
        }
      );
    }
    catch (err) {
      expect(err).instanceOf(ErrorClass);
      expect(err).toMatchObject({
        reason: eMsg,
      });
    }
    finally {
      spy.mockRestore();
    }
    expect(TestLock.isReleasedState(key)).toBeTruthy();
  }

  it("An error occurs because the existence of the `lock directory` path cannot be verified (fs.statSync() error).", async () => {
    await testFsErrorBySpyOn('statSync', { lockDirectory: 'hogehoge' }, LockDirectoryStatFailed);
 });

  it("The `lock directory` path does not exist, so an attempt is made to create it, but an error occurs.", async () => {
    const lockDirectory = path.join(process.cwd(), '.lock1234');
    await testFsErrorBySpyOn('mkdirSync', { lockDirectory }, LockDirectoryCreationFailed);
    if (fs.existsSync(lockDirectory)) {
      fs.rmSync(lockDirectory, { force: true, recursive: true });
    }
  });

  it("An error occurs because the directory path specified in `FileLock.setConfig()` already exists but is not a directory.", async () => {
    const dir = path.resolve('.lock2');
    fs.writeFileSync(dir, "");
    expect.assertions(2);
    const FileLock = createFileLock();
    try {
      FileLock.setConfig({ lockDirectory: dir, logger });
      const retVal = "notDirectory", key = retVal;
      await FileLock.withLock(key, 
        async () => {
          await sleepAsync(500);
          return retVal;
        }
      )
    }
    catch (err) {
      expect(err).instanceOf(LockDirectoryCreationFailed);
      expect(err).toMatchObject({ code: 'ELOCKDIRCREATE' });
    }
    finally {
      fs.rmSync(dir, { force: true, recursive: true });
    }
  });

/* 途中のロックディレクトリ変更禁止のため、本テストは不要
  it("Changing the directory path while a lock is held does not result in an error.", async () => {
    const retVal = "changeDir1", key = retVal;
    FileLock.setConfig({ logger: console });
    expect(await FileLock.withLock(key, 
      async () => {
        FileLock.setConfig({ lockDirectory: path.join(process.cwd(), 'test/tmp') });
        await sleepAsync(500);
        return retVal;
      },
      {}
    )).toBe(retVal);
  });
*/
/* 途中のロックディレクトリ変更禁止のため、本テストは不要
  it("Changing the directory path while a lock is held and subsequently acquiring another same-key lock.", async () => {
    const retVal = "changeDir2", key = retVal;
    FileLock.setConfig({ logger: console });
    expect.assertions(1);
    try {
      await FileLock.withLock(key, 
        async () => {
          FileLock.setConfig({ lockDirectory: path.join(process.cwd(), 'test/tmp') });
          await FileLock.withLock(key, 
            () => {
              return;
            }
          );
          await sleepAsync(500);
          return retVal;
        },
        {}
      );
    }
    catch (err) {
      expect(err).instanceOf(DeadlockDetected);
    }
  });
*/
/* 途中のロックディレクトリ変更禁止のため、本テストは不要
  it("Changing the directory path while a lock is held and subsequently acquiring another same-key lock.(allowReentry: true)", async () => {
    const retVal = "changeDir3", key = retVal;
    FileLock.setConfig({ logger: console });
    try {
      expect(await FileLock.withLock(key, 
        async () => {
          FileLock.setConfig({ lockDirectory: path.join(process.cwd(), 'test/tmp') });
          await FileLock.withLock(key, 
            () => {
              return;
            },
            { allowReentry: true }
          );
          await sleepAsync(500);
          return retVal;
        },
      )).toBe(retVal);
    }
    catch (err) {
      expect(err).instanceOf(FileLockError);
      expect(err).toMatchObject({
        code: 'EIO',
        key,
        message: "Failed to add the lock request to `lock sharer directory`."
      })
    }
  });
*/
  it("When debug mode is enabled, the history is updated.", async () => {
    const hist = FileLock.historyInfo.historyPath;
    if (fs.existsSync(hist) === false) fs.writeFileSync(hist, '');
    const stat_before = fs.statSync(hist);
    expect.assertions(1);
    FileLock.setConfig({ _debug: true, history: false });
    await FileLock.withLock('debug_mode_key', 
      async () => {
        await sleepAsync(500);
      },
    );
    const stat_after = fs.statSync(hist);
    expect(stat_before.mtimeMs).lessThan(stat_after.mtimeMs);
  });

  it("When debug mode is enabled, process-related information is appended to the meta-information.", async () => {
    const key = 'debug_mode_key_009'
    const metaFile = getLockMetaPath(key);
    expect.assertions(4);
    FileLock.setConfig({ _debug: true });
    await FileLock.withLock(key, 
      async () => {
        const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
        expect(meta.processId).toBeTypeOf('number');
        expect(meta.parentProcessId).toBeTypeOf('number');
        expect(Array.isArray(meta.processArgv) && (meta.processArgv as unknown[]).every(v => typeof v === "string")).toBeTruthy();
        expect(meta.callStack).toBeTypeOf('string');
        await sleepAsync(500);
      },
    );
  });

  function testConfigMinVal(key: keyof FileLockConfig, exp: number, val?: number, additinalExp?: () => void) {
    expect.assertions(additinalExp ? 2 : 1);
    const config = {} as Record<keyof NumberKeys<FileLockConfig>, number | undefined>;
    config[key] = val;
    FileLock.setConfig(config);
    const gConf = FileLock.getConfig();
    expect(gConf[key]).toBe(exp);
    if (additinalExp) additinalExp();
  }

  it("maxCacheEntries: undefined", () => {
    testConfigMinVal('maxCacheEntries', 100, undefined);
  });

  it("maxCacheEntries: 0", () => {
    testConfigMinVal('maxCacheEntries', 1, 0, () => expect(FileLock.getConfig().cache).toBeTruthy());
  });

  it("maxCacheEntries: -1", () => {
    testConfigMinVal('maxCacheEntries', 1, -1, () => expect(FileLock.getConfig().cache).toBeTruthy());
  });

  it("maxCacheEntries: 1", () => {
    testConfigMinVal('maxCacheEntries', 1, 1);
  });

  it("cacheTtlMs: undefined", () => {
    testConfigMinVal('cacheTtlMs', 10000, undefined);
  });

  it("cacheTtlMs: 0", () => {
    testConfigMinVal('cacheTtlMs', 10000, 0);
  });

  it("cacheTtlMs: -1", () => {
    testConfigMinVal('cacheTtlMs', 10000, -1);
  });

  it("cacheTtlMs: 10001", () => {
    testConfigMinVal('cacheTtlMs', 10001, 10001);
  });

  it("maxHistoryEntries: undefined", () => {
    testConfigMinVal('maxHistoryEntries', 100, undefined);
  });

  it("maxHistoryEntries: 0", () => {
    testConfigMinVal('maxHistoryEntries', 1, 0);
  });

  it("maxHistoryEntries: -1", () => {
    testConfigMinVal('maxHistoryEntries', 1, -1);
  });

  it("maxHistoryEntries: 99", () => {
    testConfigMinVal('maxHistoryEntries', 99, 99);
  });

  it("maxHistoryEntries: 101", () => {
    testConfigMinVal('maxHistoryEntries', 101, 101);
  });

  it("maxHistoryFiles: undefined", () => {
    testConfigMinVal('maxHistoryFiles', 100, undefined);
  });

  it("maxHistoryFiles: 0", () => {
    testConfigMinVal('maxHistoryFiles', 1, 0);
  });

  it("maxHistoryFiles: -1", () => {
    testConfigMinVal('maxHistoryFiles', 1, -1);
  });

  it("maxHistoryFiles: 99", () => {
    testConfigMinVal('maxHistoryFiles', 99, 99);
  });

  it("maxHistoryFiles: 101", () => {
    testConfigMinVal('maxHistoryFiles', 101, 101);
  });
/*
  it("maxPending: undefined", () => {
    testConfigMinVal('maxPending', 100, undefined);
  });

  it("maxPending: 0", () => {
    testConfigMinVal('maxPending', 1, 0);
  });

  it("maxPending: -1", () => {
    testConfigMinVal('maxPending', 1, -1);
  });

  it("maxPending: 99", () => {
    testConfigMinVal('maxPending', 99, 99);
  });

  it("maxPending: 101", () => {
    testConfigMinVal('maxPending', 101, 101);
  });
  
  it("maxConcurrency: undefined", () => {
    testConfigMinVal('maxConcurrency', 5, undefined);
  });

  it("maxConcurrency: 0", () => {
    testConfigMinVal('maxConcurrency', 1, 0);
  });

  it("maxConcurrency: -1", () => {
    testConfigMinVal('maxConcurrency', 1, -1);
  });

  it("maxConcurrency: 99", () => {
    testConfigMinVal('maxConcurrency', 99, 99);
  });

  it("maxConcurrency: 101", () => {
    testConfigMinVal('maxConcurrency', 101, 101);
  });
*/
  function testTypeErrorConfig(name: string | string[], value: unknown | unknown[]) {
    const conf =  {} as Record<string, unknown>;
    if (typeof name === 'string') {
      conf[name] = value;
    }
    else {
      name.forEach((n, idx) => { conf[n] = (value as unknown[])[idx]; })
    }

    try {
      FileLock.setConfig(conf);
      expect.assert(false, "Must not reach here!");
    }
    catch(err) {
      expect(err).instanceOf(InvalidConfiguration);
      expect(err).toMatchObject({
        code: 'EINVAL',
        message: "[REQUIRE] The specified configuration contains values of invalid types."
      });
      if (err instanceof InvalidConfiguration) {
        if (typeof name === 'string') expect(err).toMatchObject({ name });
        else expect(err).toMatchObject({ names : name.sort() });
      }
    }
  }

  it("An error occurs when an config value of a different type is specified(logger).", () => {
    testTypeErrorConfig('logger', true, );
    testTypeErrorConfig('logger', 'string', );
    testTypeErrorConfig('logger', 1234, );
    testTypeErrorConfig('logger', {},  );
    testTypeErrorConfig('logger', [],  );
    testTypeErrorConfig('logger', ()=>{},  );
    testTypeErrorConfig('logger', new LockError(""),  );
  });

  it("An error occurs when an config value of a different type is specified(queueManager).", () => {
    testTypeErrorConfig('queueManager', true, );
    testTypeErrorConfig('queueManager', 'string', );
    testTypeErrorConfig('queueManager', 1234, );
    testTypeErrorConfig('queueManager', {},  );
    testTypeErrorConfig('queueManager', [],  );
    testTypeErrorConfig('queueManager', ()=>{},  );
    testTypeErrorConfig('queueManager', new LockError(""),  );
  });
/*
  it("An error occurs when an config value of a different type is specified(maxPending).", () => {
    testTypeErrorConfig('maxPending', true, );
    testTypeErrorConfig('maxPending', 'string', );
    //testTypeErrorConfig('maxPending', 1234, );
    testTypeErrorConfig('maxPending', {},  );
    testTypeErrorConfig('maxPending', [],  );
    testTypeErrorConfig('maxPending', ()=>{},  );
    testTypeErrorConfig('maxPending', new LockError(""),  );
  });
*/
/*
  it("An error occurs when an config value of a different type is specified(maxConcurrency).", () => {
    testTypeErrorConfig('maxConcurrency', true, );
    testTypeErrorConfig('maxConcurrency', 'string', );
    //testTypeErrorConfig('maxConcurrency', 1234, );
    testTypeErrorConfig('maxConcurrency', {},  );
    testTypeErrorConfig('maxConcurrency', [],  );
    testTypeErrorConfig('maxConcurrency', ()=>{},  );
    testTypeErrorConfig('maxConcurrency', new LockError(""),  );
  });
*/
  it("An error occurs when an config value of a different type is specified(_debug).", () => {
    //testTypeErrorConfig('_debug', true, );
    testTypeErrorConfig('_debug', 'string', );
    testTypeErrorConfig('_debug', 1234, );
    testTypeErrorConfig('_debug', {},  );
    testTypeErrorConfig('_debug', [],  );
    testTypeErrorConfig('_debug', ()=>{},  );
    testTypeErrorConfig('_debug', new LockError(""),  );
  });

  it("An error occurs when an config value of a different type is specified(lockDirectory).", () => {
    testTypeErrorConfig('lockDirectory', true, );
    //testTypeErrorConfig('lockDirectory', 'string', );
    testTypeErrorConfig('lockDirectory', 1234, );
    testTypeErrorConfig('lockDirectory', {},  );
    testTypeErrorConfig('lockDirectory', [],  );
    testTypeErrorConfig('lockDirectory', ()=>{},  );
    testTypeErrorConfig('lockDirectory', new LockError(""),  );
  });

  it("An error occurs when an config value of a different type is specified(cache).", () => {
    //testTypeErrorConfig('cache', true, );
    testTypeErrorConfig('cache', 'string', );
    testTypeErrorConfig('cache', 1234, );
    testTypeErrorConfig('cache', {},  );
    testTypeErrorConfig('cache', [],  );
    testTypeErrorConfig('cache', ()=>{},  );
    testTypeErrorConfig('cache', new LockError(""),  );
  });

  it("An error occurs when an config value of a different type is specified(maxCacheEntries).", () => {
    testTypeErrorConfig('maxCacheEntries', true, );
    testTypeErrorConfig('maxCacheEntries', 'string', );
    //testTypeErrorConfig('maxCacheEntries', 1234, );
    testTypeErrorConfig('maxCacheEntries', {},  );
    testTypeErrorConfig('maxCacheEntries', [],  );
    testTypeErrorConfig('maxCacheEntries', ()=>{},  );
    testTypeErrorConfig('maxCacheEntries', new LockError(""),  );
  });

  it("An error occurs when an config value of a different type is specified(cacheTtlMs).", () => {
    testTypeErrorConfig('cacheTtlMs', true, );
    testTypeErrorConfig('cacheTtlMs', 'string', );
    //testTypeErrorConfig('cacheTtlMs', 1234, );
    testTypeErrorConfig('cacheTtlMs', {},  );
    testTypeErrorConfig('cacheTtlMs', [],  );
    testTypeErrorConfig('cacheTtlMs', ()=>{},  );
    testTypeErrorConfig('cacheTtlMs', new LockError(""),  );
  });

  it("An error occurs when an config value of a different type is specified(defaultOptions).", () => {
    testTypeErrorConfig('defaultOptions', true, );
    testTypeErrorConfig('defaultOptions', 'string', );
    testTypeErrorConfig('defaultOptions', 1234, );
    //testTypeErrorConfig('defaultOptions', {},  );
    testTypeErrorConfig('defaultOptions', [],  );
    testTypeErrorConfig('defaultOptions', ()=>{},  );
    //testTypeErrorConfig('defaultOptions', new LockError(""),  );
  });

  it("An error occurs when an config value of a different type is specified(history).", () => {
    //testTypeErrorConfig('history', true, );
    testTypeErrorConfig('history', 'string', );
    testTypeErrorConfig('history', 1234, );
    testTypeErrorConfig('history', {},  );
    testTypeErrorConfig('history', [],  );
    testTypeErrorConfig('history', ()=>{},  );
    testTypeErrorConfig('history', new LockError(""),  );
  });
 
  it("An error occurs when an config value of a different type is specified(maxHistoryEntries).", () => {
    testTypeErrorConfig('maxHistoryEntries', true, );
    testTypeErrorConfig('maxHistoryEntries', 'string', );
    //testTypeErrorConfig('maxHistoryEntries', 1234, );
    testTypeErrorConfig('maxHistoryEntries', {},  );
    testTypeErrorConfig('maxHistoryEntries', [],  );
    testTypeErrorConfig('maxHistoryEntries', ()=>{},  );
    testTypeErrorConfig('maxHistoryEntries', new LockError(""),  );
  });

  it("An error occurs when an config value of a different type is specified(maxHistoryFiles).", () => {
    testTypeErrorConfig('maxHistoryFiles', true, );
    testTypeErrorConfig('maxHistoryFiles', 'string', );
    //testTypeErrorConfig('maxHistoryFiles', 1234, );
    testTypeErrorConfig('maxHistoryFiles', {},  );
    testTypeErrorConfig('maxHistoryFiles', [],  );
    testTypeErrorConfig('maxHistoryFiles', ()=>{},  );
    testTypeErrorConfig('maxHistoryFiles', new LockError(""),  );
  });

  it("An error occurs when some config values of a different type is specified.", () => {
    testTypeErrorConfig(
      ['logger', 'queueManager', '_debug', 'lockDirectory', 'cache', 'maxCacheEntries', 'cacheTtlMs', 'defaultOptions', 'history', 'maxHistoryEntries', 'maxHistoryFiles', ], 
      [true,     'string',       {},       [],               1234,   ()=>{},            new LockError(""), true,        'string',  [],                  ()=>{}, ], 
      );
  });

  it("Set the maximum number of history files to 0.", async () => {
    const key = "MaxHisFiles_0";
    // Even if maxHistoryFiles is set to 0, it is adjusted to 1, so the history file remains.
    FileLock.setConfig({ maxHistoryFiles: 0, history: false, _debug: false });
    await FileLock.withLock(key, () => {});
    expect(fs.existsSync(getHistoryPath())).toBeTruthy();
  });
/*
  it ("Setting { cache: false } results in a new instance being created each time.", () => {
    FileLock.setConfig({ cache: false });
    const key = 'CacheFalseKey';
    expect(TestLock.getFileLock(key)).not.toBe(TestLock.getFileLock(key));
  });

  it ("Setting { cache: true } results in the reuse of instances.", () => {
    const key = 'CacheTrueKey';
    FileLock.setConfig({ cache: true });
    expect(TestLock.getFileLock(key)).toBe(TestLock.getFileLock(key));
  });
*/

// ★★★
/*
ロックディレクトリ再設定禁止のテスト
- １度設定⇒２度目エラー
- １度設定⇒ロック　⇒　２度目エラー
- １度設定⇒２度目　同じディレクトリ　エラーなし
- １度設定⇒ロックー＞２度目　同じディレクトリ　エラーなし
- 未指定　⇒　ロック　⇒　設定でエラー
*/
  it("update `lock directory`.", () => {
    const lockDirectory = path.resolve('.lock_test');
    const FileLock = createFileLock();
    FileLock.setConfig({ lockDirectory });
    expect.assertions(2);
    try {
      FileLock.setConfig({ lockDirectory: '.lock_test2' });
    }
    catch (err) {
      expect(err).instanceOf(InvalidConfiguration);
      expect(err).toMatchObject({
        code: "EINVAL",
        message: "[REQUIRE] Updating the `lock directory` is prohibited.",
        name: "lockDirectory",
      });
    }
    finally {
      fs.rmSync(lockDirectory, { force: true, recursive: true });
    }
  });

  it("lock and update `lock directory`.", async () => {
    const lockDirectory = path.resolve('.lock_test');
    const FileLock = createFileLock();
    FileLock.setConfig({ lockDirectory });
    const key = 'update_lock_directory1';
    await FileLock.withLock(key, () => {});
    expect.assertions(3);
    try {
      FileLock.setConfig({ lockDirectory: '.lock_test2' });
    }
    catch (err) {
      expect(err).instanceOf(InvalidConfiguration);
      expect(err).toMatchObject({
        code: "EINVAL",
        message: "[REQUIRE] Updating the `lock directory` is prohibited.",
        name: "lockDirectory",
      });
    }
    finally {
      fs.rmSync(lockDirectory, { force: true, recursive: true });
    }
    expect(TestLock.isReleasedState(key))
  });

  it("update `lock directory` but same path.", async () => {
    const lockDirectory = '.lock_test';
    const FileLock = createFileLock();
    expect.assertions(1);
    try {
      FileLock.setConfig({ lockDirectory });
      FileLock.setConfig({ lockDirectory });
      const key = 'update_lock_directory2';
      await FileLock.withLock(key, () => {});
      FileLock.setConfig({ lockDirectory: '.lock_test' });
      expect(TestLock.isReleasedState(key))
    }
    finally {
      fs.rmSync(lockDirectory, { force: true, recursive: true });
    }
  });

  it("no specfied `lock directory`, lock and update.", async () => {
    const key = 'update_lock_directory3';
    const FileLock = createFileLock();
    const lockDirectory = '.lock_test';
    await FileLock.withLock(key, () => {});
    expect.assertions(3);
    try {
      FileLock.setConfig({ lockDirectory });
    }
    catch (err) {
      expect(err).instanceOf(InvalidConfiguration);
      expect(err).toMatchObject({
        code: "EINVAL",
        message: "[REQUIRE] Updating the `lock directory` is prohibited.",
        name: "lockDirectory",
      });
    }
    finally {
      fs.rmSync(lockDirectory, { force: true, recursive: true });
    }
    expect(TestLock.isReleasedState(key))
  });

  it("update `lock directory`, lock, reest and update.", async () => {
    const key = 'update_lock_directory4';
    const lockDirectory = '.lock_test';
    const FileLock = createFileLock();
    FileLock.setConfig({ lockDirectory });
    expect.assertions(3);
    await FileLock.withLock(key, () => {});
    FileLock.resetConfig();
    FileLock.setConfig({ lockDirectory });
    try {
      FileLock.setConfig({ lockDirectory: '.lock_test2' });
    }
    catch (err) {
      expect(err).instanceOf(InvalidConfiguration);
      expect(err).toMatchObject({
        code: "EINVAL",
        message: "[REQUIRE] Updating the `lock directory` is prohibited.",
        name: "lockDirectory",
      });
    }
    finally {
      fs.rmSync(lockDirectory, { force: true, recursive: true });
    }
    expect(TestLock.isReleasedState(key))
  });

  it("no specfied `lock directory`, lock, reest and update.", async () => {
    const key = 'update_lock_directory5';
    const lockDirectory = '.lock_test';
    const FileLock = createFileLock();
    await FileLock.withLock(key, () => {});
    expect.assertions(3);
    FileLock.resetConfig();
    try {
      FileLock.setConfig({ lockDirectory });
    }
    catch (err) {
      expect(err).instanceOf(InvalidConfiguration);
      expect(err).toMatchObject({
        code: "EINVAL",
        message: "[REQUIRE] Updating the `lock directory` is prohibited.",
        name: "lockDirectory",
      });
    }
    finally {
      fs.rmSync(lockDirectory, { force: true, recursive: true });
    }
    expect(TestLock.isReleasedState(key))
  });

  it("tow FileLock class object's settings are independent.", () => {
    const FileLock1 = createFileLock();
    const FileLock2 = createFileLock();
    expectObjectToMatch(FileLock1.getConfig(), FileLock.defaultConfig);
    //expect(FileLock1.getConfig()).toMatchObject(FileLock.defaultConfig);
    const config1: FileLockConfig = { ...FileLock.defaultConfig, cache: false };
    FileLock1.setConfig(config1);

    expectObjectToMatch(FileLock1.getConfig(), config1);
    try {
      expect(() => {
        expectObjectToMatch(FileLock2.getConfig(), config1);
      }).toThrow(/Property "cache"/);
      //expectObjectToMatch(FileLock2.getConfig(), config1);
    }
    catch (err) {
      expect(err).instanceOf(AssertionError);
    }
    //expect(FileLock1.getConfig()).toMatchObject(config1);
    //expect(FileLock2.getConfig()).not.toMatchObject(config1);
  });

  it("queueManager: undefined.", () => {
    // ★★★　setConfigが遅延実行されるので、デフォルトのcreationのときだけ、遅延実行にして、このように利用者がcreateするときは、setConfigするようにする。
    // つまり、非公開？？（この関数はImpl分のみ用意すればよいかな？？）createInternal(config: XXX, setConfig(遅延設定フラグ的な名前にせよ): boolean)とし、
    // createFileLock(config)が公開されており、実際には、return createInternal(config, true)
    // そして、内部では、createInternal(config, false)
    // ★★同じ理由で、createXXImplもそうすべき
    const FileLock = createFileLock({ queueManager: undefined });
    expect(FileLock.numberOfQueues).toBe(0);
  });

  it("getConfig().logger(console).", () => {
    const spyDebug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const MyLock = createFileLock({ _debug: true, logger: console });
    const logger = MyLock.getConfig().logger!;
    try {
      logger.debug("debug");
      expect(spyDebug).calledWith("debug");
    }
    finally {
      spyDebug.mockRestore();
    }
  });

  it("getConfig().logger.", () => {
    let _log, _info, _trace, _debug, _warn, _error, _fatal;
    const dummyLogger: LogProvider = {
      log: (arg: string)=>{_log = arg;}, 
      info: (arg: string)=>{_info = arg;}, 
      trace: (arg: string)=>{_trace = arg;}, 
      debug: (arg: string)=>{_debug = arg;}, 
      warn: (arg: string)=>{_warn = arg;}, 
      error: (arg: string)=>{_error = arg;}, 
      fatal: (arg: string)=>{_fatal = arg;}
    }
    const MyLock = createFileLock({ _debug: true, logger: dummyLogger });
    const logger = MyLock.getConfig().logger!;
    logger.trace("trace");
    logger.debug("debug");
    logger.log("log");
    logger.info("info");
    logger.warn("warn");
    logger.error("error");
    logger.fatal!("fatal");
    expect(_trace).toBe("trace");
    expect(_debug).toBe("debug");
    expect(_log).toBe("log");
    expect(_info).toBe("info");
    expect(_warn).toBe("warn");
    expect(_error).toBe("error");
    expect(_fatal).toBe("fatal");
  });

  it("getConfig().queueManager.", async () => {
    const MyLock = createFileLock();
    const queueManager = MyLock.getConfig().queueManager!;
    
    expect(queueManager.maxConcurrency).toBe(defaultQueueManager.maxConcurrency);
    expect(queueManager.maxPending).toBe(defaultQueueManager.maxPending);
    expect(queueManager.numberOfAllEntries).toBe(defaultQueueManager.numberOfAllEntries);
    expect(queueManager.numberOfPending).toBe(defaultQueueManager.numberOfPending);
    expect(queueManager.numberOfRunning).toBe(defaultQueueManager.numberOfRunning);
    expect(queueManager.numberOfAllQueues).toBe(defaultQueueManager.numberOfAllQueues);
    expect(queueManager.numberOfQueues).toBe(defaultQueueManager.numberOfQueues);

    const ret = await queueManager.enqueue<boolean>(() => { return true;}, { timeout: 100, reason: "test" });
    expect(ret).toBeTruthy();

    const hoge = queueManager.getCandidates();
    const moge = defaultQueueManager.getCandidates();
    expect(hoge.length).toBe(moge.length);
    expect(hoge.every((v, i) => v.id === moge[i].id)).toBeTruthy();
  });

});
