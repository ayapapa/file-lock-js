import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { expect } from 'vitest';
import { PrettyConsole, type Config as PrettyCOnfig,  type LogEntry } from '@ayapapa-npm/pretty-console-js';
import { pino } from 'pino'
import { createStream } from 'rotating-file-stream'
import { AlreadyLocked, FileLock, type FileLockOptions } from '../src/index.ts';
import { type FileLockRequiredOptions } from '../src/lib/FileLockInternal.ts';
import { FileLockInternal } from '../src/lib/FileLockInternal.ts';

export async function sleepAsync(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const isCI = process.env.CI === 'true';

const config = { level: 'debug', compact: true } as PrettyCOnfig;

// Do not output file logs during CI (to prevent CI errors)
if (isCI === false) {
  const logDir = path.resolve('./logs')
  fs.mkdirSync(logDir, { recursive: true })

  const stream = createStream((time: Date | number) => {
    if (!time) return 'file-lock.log'
    const date = new Date(time);
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `file-lock-${yyyy}-${mm}-${dd}.log`
  }, {
    path: logDir,
    interval: '1d',
    intervalBoundary: true,
    initialRotation: true,
    maxFiles: 14
  });

  const pinoLogger = pino(
    {
      level: 'trace',
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: label => ({ level: label.toUpperCase() }),
      },
    },
    stream,
  );

  const onPrettyLog = ( logEntry: LogEntry ) => {
    const method = logEntry.method === 'log' ? 'info' : logEntry.method;
    const err = logEntry.args.find(arg => arg instanceof Error);
    if (err) {
      // Pino's type definition expects the second argument to be a string.
      // Use Reflect.apply to pass the arguments as-is.
      Reflect.apply(pinoLogger[method], pinoLogger, [err, logEntry.args]);    }
    else {
      pinoLogger[method](logEntry.args);
    }
  }

  config.onLog = onPrettyLog;

}

export const logger = new PrettyConsole(config);

export function getLockMetaPath(key: string): string {
  return path.join(TestLock.getLockDirPath(), key + '.json');
}

export function getLockSharerDir(key: string): string {
  return path.join(TestLock.getLockDirPath(), key + '.sharer');
}

export const getLockMeta = (key: string) => {
  const lockMetaPath = getLockMetaPath(key);
  const contents: string = fs.readFileSync(lockMetaPath, 'utf8');
  return JSON.parse(contents);
};

export const setLockMeta = (key: string, meta: unknown) => {
  const lockMetaPath = getLockMetaPath(key);
  fs.mkdirSync(path.dirname(lockMetaPath), {recursive: true});
  fs.writeFileSync(lockMetaPath, JSON.stringify(meta));
};

export function removeLockFiles(key: string) {
  const lockMetaPath = getLockMetaPath(key);
  if (fs.existsSync(lockMetaPath)) fs.unlinkSync(lockMetaPath);
  const lockMetaTmpPath = getLockMetaPath(key) + '.tmp';
  if (fs.existsSync(lockMetaTmpPath)) fs.unlinkSync(lockMetaTmpPath);
  const sharer = getLockSharerDir(key);
  if (fs.existsSync(sharer)) fs.rmSync(sharer, { force: true, recursive:true });
}

export function getHistoryPath() {
  return TestLock.getHistoryPath();
}

export interface Options {
  key: string, 
  sleep: number, 
  timeOutMs?: number, // default is 5000 
  ttlMs?: number, // default is 2000
  heartbeatTtlMs?: number, // default is 5000
  waitAquired?: boolean, // default is false
};

export const commandPath = './subCommand.ts';
export const stdOut: string[] = [];
export const stdErr: string[] = [];
export const childErrors = [] as string[];
export let childErrCount = 0;
export let childExecCount = 0;

const childExecCounts = [] as number[];
const childErrCounts = [] as number[];

export function eachAfterStressTest() {
  childExecCounts.push(childExecCount);
  childErrCounts.push(childErrCount);
}


export function resetExecResources() {
  stdOut.splice(0);
  stdErr.splice(0);
  childErrCount = 0;
  childExecCount = 0;
}

// A function that executes a child process asynchronously.
export async function execChild(command: 'lock' | 'sleep', options: Options) {
  const cmodPath = path.isAbsolute(commandPath) ? commandPath : path.resolve(__dirname, commandPath);
  const args: string[] = [
    cmodPath, 
    command, 
    options.key, 
    String(options.sleep), 
    String(options.timeOutMs ?? 5000), 
    String(options.ttlMs ?? 2000),
    String(options.heartbeatTtlMs ?? 5000),
  ];
  
  const child = spawn('node', args);
  childExecCount++;

  let locked = false;
  let errMsg = '';

  child.stdout?.on('data', data => {
    const str: string = data.toString();
    process.stdout.write(str);
    stdOut.push(str);
    if (str.includes('Child acquired lock')) {
      locked = true;
    }
  });
  child.stderr?.on('data', data => {
    const msg = data.toString();
    if (msg.includes('FATAL') || msg.includes('ERROR')) {
      errMsg = msg;
      childErrors.push(msg);
      childErrCount++;
    }
    process.stderr.write(msg);
    stdErr.push(msg);
  });

  const promise = new Promise((resolve, reject) => {
    child.once('error', reject);

    child.once('close', (code, signal) => {
      if (code === 0) {
        resolve({ code, signal });
      } else {
        reject(`child failed: code=${code} signal=${signal} msg=${errMsg}`);
      }
    });
  });

  if (options.waitAquired && command === 'lock') {
    const cStart = Date.now();
    while(locked === false && (Date.now() - cStart) <= options.sleep + 110) {
      await sleepAsync(100);
    }
  }

  return { cid: child, promise };
} 

const BROKEN_ERROR_WATCH_MODE: boolean = false;
const BROKEN_ERRORS = [] as unknown[];
const COMPROMISED_ERRORS = [] as unknown[];
const PARENT_ERRORS = [] as unknown[];

export function init() {
  childErrors.slice(0);
  childExecCounts.splice(0);
  childErrCounts.splice(0);

  BROKEN_ERRORS.splice(0);
  COMPROMISED_ERRORS.splice(0);
  PARENT_ERRORS.splice(0);
}

export function report() {
  const cErrs =  [] as string[];
  childErrors.forEach((eStr) => {
    cErrs.push(eStr
      .split(/\r?\n/)
      .filter(line => !line.includes("    at ") && line.includes("Error"))
      .join("\n")
    )
  });

  logger.log(`### Child errors(count = ${cErrs.length}) =`, cErrs);
  logger.log("### PARENT_ERRORS =", PARENT_ERRORS);
  logger.log("### BROKEN_ERRORS =", BROKEN_ERRORS);
  
  logger.log("### PARENT_ERRORS count =", PARENT_ERRORS.length);
  logger.log("### BROKEN_ERRORS count =", BROKEN_ERRORS.length);
  logger.log("### COMPROMISED_ERRORS count =", COMPROMISED_ERRORS.length);
  logger.log("### Child exec count =", childExecCounts);
  logger.log("### Child error count =", childErrCounts);
}

/**
 * @param n       Number of concurrently executing processes (consisting of one parent (main) process and n-1 child processes)
 * @param oneKey  A key used when setting all items to the same key
 */
export async function testMultiProcess(n: number, oneKey?: string, opts?: { sleep?: number, timout?: number, hbTtl?: number }) {
  const sleep = opts?.sleep ?? 100;
  const timeoutMs = opts?.timout ?? 5000;
  const heartbeatTtlMs = opts?.hbTtl ?? 5000;
  const options: FileLockOptions = { timeoutMs/*: 5000*/, ttlMs: 5000, heartbeatTtlMs/*: 5000*/ };
  const parentKey = oneKey ? oneKey : "testMultiProcess"
  const parentPr = FileLock.withLock(parentKey, async () => { await sleepAsync(/*100*/sleep); return 'completed'; }, options);
  const childrenPr = [] as Promise<unknown>[];
  const childrenKey = [] as string[];
  for( let i = 0; i < n - 1; i++) {
    const key = oneKey ? oneKey : `childKey_${String(i).padStart(4, '0')}`;
    childrenPr.push((await execChild('lock', { key, sleep/*: 500*/, waitAquired: false, ...options })).promise);
    if (oneKey === undefined) childrenKey.push(key);
  }

  const checkState = (key: string) => {
    const state = TestLock.isReleasedStateDetail(key);
    expect(state.lock_acquired).toBe('ok');
    expect(state.lock_heartbeatTimer).toBe('ok'); 
    expect(state.lockfile_removed).toBe('ok');
    expect(state.lockSharersDir_removed).toBe('ok');
    expect(state.lockfile_tmp_removed).toBe('ok');
  };

  const results = await Promise.allSettled([parentPr, ...childrenPr]);
  const pResult = results[0];
  const cResults = results.slice(1);

  // Check the parent's result.
  if (pResult.status === 'fulfilled') {
    expect(pResult).toMatchObject({
      status: 'fulfilled',
      value: 'completed'
    });
  }
  else {
    const reason = ('reason' in pResult) ? pResult.reason : ''; 
    // 破損ファイルの発見が無ければOK。
    const foundBroken: boolean = reason instanceof AlreadyLocked && reason.message.includes('InvalidMetadata');
    if (BROKEN_ERROR_WATCH_MODE === false) expect(foundBroken).toBeFalsy();
    if (foundBroken) {
      BROKEN_ERRORS.push(reason);
    }
    const foundCompromised: boolean = reason instanceof Error && reason.message.toLocaleLowerCase().includes('compromised');
    if (foundCompromised) COMPROMISED_ERRORS.push(reason);
    PARENT_ERRORS.push(reason);
  }
  childrenPr.forEach((_, i) => {
    if (oneKey == null) {
      checkState(childrenKey[i]);
    } 
    const result = cResults[i];
    if (result.status === 'rejected') {
      const reason = ('reason' in result) ? result.reason as string : ''; 
      const foundBroken: boolean = reason.includes('InvalidMetadata');
      if (BROKEN_ERROR_WATCH_MODE === false) expect(foundBroken).toBeFalsy();
      if (foundBroken) {
        BROKEN_ERRORS.push(reason);
      }
      const foundCompromised: boolean = reason.toLocaleLowerCase().includes('compromised');
      if (foundCompromised) COMPROMISED_ERRORS.push(reason);
      
    }
    else {
      expect(cResults[i]).toMatchObject({
        status: 'fulfilled',
        value: { code: 0, signal: null, }
      });
    }
  });

  checkState(parentKey);
}

/**
 * Lock for testing
 */
// @ts-expect-error constructor of `FileLock` is private.
export class TestLock extends FileLockInternal {

  static getExitFuncs() {
    return super["_onExitFns"];
  }

  // Get a `TestLock` instance.
  static getLock(key: string): TestLock {
    return new TestLock(super["_getLock"](key));
  }

  // Get a `FileLock` instance.
  static getFileLock(key: string): FileLock {
    return super["_getLock"](key);
  }

  static isReleasedStateDetail(key: string) {
    const lock = this.getLock(key);
    return {
      lock_acquired: lock["_acquired"] === false ? 'ok' : 'ng',
      lock_heartbeatTimer: lock["_isALiveHeartbeatTimer"] === false ? 'ok' : 'ng', 
      lockfile_removed: fs.existsSync(getLockMetaPath(key)) === false ? 'ok' : 'ng',
      lockSharersDir_removed: fs.existsSync(getLockSharerDir(key)) === false ? 'ok' : 'ng',
      lockfile_tmp_removed: fs.existsSync(getLockMetaPath(key) + '.tmp') === false? 'ok' : 'ng',
    }
  }
  static isReleasedState(key: string): boolean {
    const state = this.isReleasedStateDetail(key);
    return state.lock_acquired === 'ok' &&
      state.lock_heartbeatTimer === 'ok' && 
      state.lockfile_removed === 'ok' &&
      state.lockSharersDir_removed === 'ok' &&
      state.lockfile_tmp_removed === 'ok';
  }

  static getLockDirPath() {
    return FileLock.lockDir;
  }

  static getHistoryPath(): string {
    return FileLock.historyInfo.historyPath;
  }


  static testAddOnExit(fn: (code: unknown, signal: unknown)=>void): void {
    super._addOnExit(fn);
  }

  constructor(lock?: FileLock) {
    super("TestLock_Key");
    Object.assign(this, lock);
  }

  async testWithLockEmptyOptions(cb: () => unknown): Promise<unknown> {
    return super["_withLock"](cb, {} as FileLockRequiredOptions);
  }
  debugLog(...args: unknown[]) {
    this._debugLog(...args);
  }

}

FileLock.setConfig({ logger, history: true, _debug: true });
