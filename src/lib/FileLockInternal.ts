import path from 'node:path';
import fs from 'node:fs';
import { Cache } from './Cache.ts';
import { DateFormatter } from '@ayapapa-npm/date-formatter-js';
import { ENSURE_DEBUG, REQUIRE, REQUIRE_DEBUG, VERIFY } from './Contracts.ts';
import { defaultLockBaseOptions, minimumLockBaseOptions, LockBase, type CallbackOnLock, type LockBaseRequiredNumericOptions, type LockBaseRequiredOptions, type MaybePromise } from './LockBase.ts';
import { type FileLockOptions } from './FileLockOptions.ts';
import { type FileLockInternalState } from './FileLockInternalState.ts';
import { FileLockOptionsResolver } from "./FileLockOptionsResolver.ts";
import { FileLockError, LockCompromised, LockDirectoryCreationFailed, LockDirectoryStatFailed} from './FileLockErrors.ts';
import { type AllOptions as AllOptionsT } from './AllOptions.ts';
import { type FileLockConfig } from './FileLockConfig.ts';
import { getCallStack, includesAllKeysOf/*, sleepAsync*/ } from './Util.ts'
import { type FileLockMeta } from './FileLockMeta.ts'
import { AlreadyLocked, InvalidOptions, ReleaseFailed } from './LockBaseErrors.ts';
import { ExponentialDelay, FixedDelay, retry  } from './RetryDelay.ts';
import { defaultLockBaseConfig } from './LockBaseConfig.ts'

/**
 * Definition of required properties for the FileLockOtions.
 */
export type FileLockRequiredOptions = Required<Pick<FileLockOptions, 
  'pollIntervalMs' | 'heartbeatIntervalMs' | 'heartbeatTtlMs' | 'heartbeatRetryIntervalMs' | 'retriesOnIoErr' | 'retryIoIntervalMs'>> & LockBaseRequiredOptions;

/**
 * Definition of required numeric properties of the FileLockOtions.
 */
export type FileLockRequiredNumericOptions = Pick<FileLockRequiredOptions, 
  'pollIntervalMs' | 'heartbeatIntervalMs' | 'heartbeatTtlMs' | 'heartbeatRetryIntervalMs' | 'retriesOnIoErr' | 'retryIoIntervalMs'> & LockBaseRequiredNumericOptions;

/** History information. */
export type HistoryInfo = { historyEnabled: boolean, historyId: string, historyPath: string, processId: number };

/** 
 * @ internal
 * All options type.
 */
type AllOptions = AllOptionsT<FileLockAllOptions, FileLockInternalState>;

/**
 * @ internal
 * The options actually used within FileLockOptions. 
 */
type FileLockAllOptions = FileLockRequiredOptions & Pick<FileLockOptions, 'invalidTtlMs'>

/** @internal */
type RetryMode = 'normal' | 'no-retry' | 'double';

/** @internal */
type Ticket = { confirm: (meta: FileLockMeta) => Promise<void>, release: () => Promise<void> }; 

/** @internal */
type TryResult = { locked: boolean, reason: string, cause?: unknown };

/**
 * Definition of default values ​​for FileLockOtions.
 */
export const defaultFileLockOptions : Readonly<FileLockRequiredOptions> = {
  ...defaultLockBaseOptions,
  pollIntervalMs:           100,
  heartbeatIntervalMs:      1000,
  heartbeatTtlMs:           5000,
  heartbeatRetryIntervalMs: 100,
  retriesOnIoErr:           1,
  retryIoIntervalMs:        100,
};

/**
 * Definition of the minimum value for required numeric properties of the FileLockOtions.
 */
export const minimumFileLockOptions: Readonly<FileLockRequiredNumericOptions> = {
  ...minimumLockBaseOptions,
  pollIntervalMs:           100,
  heartbeatIntervalMs:      1000,
  heartbeatTtlMs:           5000,
  heartbeatRetryIntervalMs: 100,
  retriesOnIoErr:           0,
  retryIoIntervalMs:        100,
}

/**
 * @internal
 * Default values ​​for FileLockConfig. 
 */
export const defaultFileLockConfig: Readonly<Required<FileLockConfig>> = {
  ...defaultLockBaseConfig,
  cache:              true,
  cacheMaxNum:        100,
  cacheTtlMs:         10000,
  defaultOptions:     { ...defaultFileLockOptions },
  history:            false,
  lockDirectory:      null,
  maxHistoryEntries:  100,
  maxHistoryFiles:    100,
};

/**
* File locking. 
* Acquires a lock by creating a file derived from the specified key, executes the provided callback, and then releases the lock (by deleting the created file). 
* While the file exists, no other lock can be acquired for the same key. 
* Settings such as `timeoutMs` allow for waiting until an unreleased lock is freed. 
*/
export class FileLockInternal extends LockBase<FileLockAllOptions, FileLockInternalState> {

  /** 
   * Static fields 
   */

  /**
   * @internal
   * FileLock instance cache associated with a key. 
   */
  static #cache: Cache<string, FileLockInternal> | null;

  /** 
   * @internal
   * Current configurations.
   */
  static #config: Required<FileLockConfig> = FileLockInternal._copyConfig(defaultFileLockConfig);

  /**
   * @internal
   * The `lock directory`
   */
  static #lockDir = FileLockInternal.#getLockDirPath();

  /**
   * @internal
   * The history directory path.
   */
  static #historyDir = path.join(FileLockInternal.#lockDir, 'history');

  /**
   * @internal
   * The history file name.
   */
  static #historyId: string = DateFormatter.format(new Date(), "yyyyMMdd-HHmmss.fff") + '-' + crypto.randomUUID().slice(0, 12);

  /**
   * @internal
   * The history file name.
   */
  static #historyName: string = `${FileLockInternal.#historyId}.json`;

  /**
   * @internal
   * The history file path.
   */
  static #historyPath = path.join(FileLockInternal.#historyDir, FileLockInternal.#historyName);

  /** 
   * Static methods
   */

  /** 
   * @internal
   * Initialize.
   */
  public static _initialize() {
    FileLockInternal.resetConfig();
    FileLockInternal._addOnExit(FileLockInternal.#onExitFn);
  }

  /** Get current configurations. */
  public static getConfig(): Required<FileLockConfig> {
    return FileLockInternal._copyConfig(FileLockInternal.#config);
  }

  /** Get default configurations. */
  public static get defaultConfig(): Required<FileLockConfig> {
    return FileLockInternal._copyConfig(defaultFileLockConfig);
  }

  /**
   * Get default options.
   * @returns Default options.
   */
  public static get defaultOptions(): FileLockOptions {
    return { ...defaultFileLockOptions };
  }

  /**
   * Get the history informations.
   * @returns Returns the history permission flag, history identifier, history file path, and process identification.
   */
  public static get historyInfo(): Readonly<HistoryInfo> {
    return {
      historyEnabled: FileLockInternal.#config.history,
      historyId: FileLockInternal.#historyId,
      historyPath: FileLockInternal.#historyPath,
      processId: process.pid,
    }
  }

  /** Get `lock directory` */
  public static get lockDir() { return FileLockInternal.#lockDir; }

  /** Resets the current settings to their default values. */
  public static resetConfig(): void {
    FileLockInternal.setConfig(defaultFileLockConfig);
  }

  /**
   * Set configurations.<br>
   * Overwrite part of the current settings. 
   * At the same time, the cache is cleared.
   * @param config  Lock configurations. 
   */
  public static override setConfig(config: FileLockConfig): void {
    super.setConfig(config);

    const dConf = Object.assign(FileLockInternal._copyConfig(config), LockBase._config);
    if (dConf.cacheTtlMs != null) dConf.cacheTtlMs = Math.max(dConf.cacheTtlMs, 10000);
    if (dConf.cacheMaxNum != null) dConf.cacheMaxNum  = Math.max(dConf.cacheMaxNum, 0);
    if (dConf.maxHistoryEntries != null) dConf.maxHistoryEntries = Math.max(dConf.maxHistoryEntries, 0);
    if (dConf.maxHistoryFiles != null) dConf.maxHistoryFiles = Math.max(dConf.maxHistoryFiles, 0);

    // If defaultOptions is specified, resolve it.
    if (dConf.defaultOptions) {
      dConf.defaultOptions = new FileLockOptionsResolver(dConf.defaultOptions, minimumFileLockOptions).getOptions();
    }
    FileLockInternal.#config = { ...FileLockInternal.getConfig(), ...dConf };

    // chache
    FileLockInternal.#cache?.clear();
    if (FileLockInternal.#config.cacheMaxNum === 0) FileLockInternal.#config.cache = false;
    // If cache is enabled, (Re)create cache.
    if (FileLockInternal.#config.cache) {
      FileLockInternal.#cache = new Cache<string, FileLockInternal>({
        max: FileLockInternal.#config.cacheMaxNum,
        ttlMs: FileLockInternal.#config.cacheTtlMs,
      });
    }
    // or set null to chache.
    else {
      FileLockInternal.#cache = null;
    }

    // `lock directory`
    FileLockInternal.#lockDir = FileLockInternal.#getLockDirPath();

    // history
    if (FileLockInternal.#config.history || FileLockInternal.#config._debug) {
      FileLockInternal.#historyDir =  path.join(FileLockInternal.#lockDir, 'history');
      try {
        fs.mkdirSync(FileLockInternal.#historyDir, { recursive: true });
      }
      catch (err) {
        throw new FileLockError('Failed to create the directory for storing history files.', { code: 'EIO', props: { causes: [err] }})
      }
      FileLockInternal.#historyPath =  path.join(FileLockInternal.#historyDir, FileLockInternal.#historyName);
    }
  }

  /**
   * @internal
   * Get `lock` instance. <br>
   * It is set to `private` for testing purposes.
   * @param key Lock key. 
   */
  public static _getLock(key: string): FileLockInternal {
    let lock = FileLockInternal.#cache?.get(key);
    if (!lock) {
      lock = new FileLockInternal(key);
      FileLockInternal.#cache?.set(key, lock);
    }
    return lock;
  }
  
  /**
   * @internal
   * Get a directory path for storing files containing lock information.
   */
  static #getLockDirPath() {
    const existsDir = (name: string): boolean => {
      let stat;
      try {
        stat = fs.statSync(name);
      }
      catch (err) {
        REQUIRE(err instanceof Error, 'The caught object was not an Error instance.', FileLockError, { code: 'EUNEXPECTED', props: { cause: err } });
        const e = err as Error; // Type-cast because it has been verified.
        const code = 'code' in e && String(e.code);
        if (code === 'ENOENT') return false;
        throw new LockDirectoryStatFailed(e.message, { path: name, props: { fsErrCode: code } } );
      }
      
      if (stat.isDirectory()) return true

      throw new FileLockError(`'${name}' is not a directory.`, { code: 'ENOTDIR', props: { path: name } });
    }

    const mkdir = (name: string): void => {
      try {
        fs.mkdirSync(name,  { recursive: true });
      }
      catch (err) {
        const errIns = err instanceof Error;
        let msg = '';
        let code = '';
        (errIns && 'message' in err) && (msg = err.message);
        (errIns && 'code' in err)    && (code = String(err.code));
        throw new LockDirectoryCreationFailed(msg, { path: name, props: { path: name, fsErrCode: code } }); 
      }
    }

    const candidates = [
      [FileLockInternal.#config.lockDirectory, true],
      [path.join(process.cwd(), '.lock'), false],
    ] as const;

    // Create a `lock directory`.
    let attempted: string = '';
    for (const [dir, required] of candidates) {
      if (!dir) continue;
      attempted += "\n" + `- ${dir}`;
      try {
        if (existsDir(dir) === false) mkdir(dir);
        return dir;
      }
      catch (err) {
        if (required) throw err;
        continue;
      }
    };
    // Failed to create `lock directory`.
    throw new LockDirectoryCreationFailed(
      "Failed to create the `lock directory`." +
      "\nAttempted to locate and create it in the following order:" +
      attempted,
      { props: { candidates: attempted } }
    );
  }

  /**
   * @internal
   * Termination processing. 
   * On Windows, this is not called upon forced termination (process.kill()), but the implementation is retained.
   * @param code    Exit code.
   * @param signal  The signal that caused the termination.
   */
  static #onExitFn(code: number | null | undefined, signal: NodeJS.Signals | null) {
    FileLockInternal._logger.trace("Exited by", { code, signal });
    FileLockInternal.#cache?.forEach(value => value.#onExit(code, signal));
  }

  /**
   * @internal
   * Heartbeat timer id 
   */
  #heartbeatTimer: NodeJS.Timeout | null = null;

  /**
   * @internal
   * Whether or not a heartbeat update is in progress.
   */
  #heatbeatUpdating = false;

  /**
   * @internal
   * Latest heartbeat update time.
   */
  #heartbeatExpiresAt: number = 0;

  /**
   * @internal
   * Creates a FileLock instance.
   * @param {string}  key Locking key.
   */
  private constructor(key: string) {
    super(key);
  }

  /**
   * @internal
   * Acquires a lock, executes the function `onLockFn` under exclusive control, 
   * and returns a Promise that resolves with the return value of `onLockFn` after the lock is released. 
   * @param onLockFn  Callback function to execute while the lock is held.
   * @param options   Lock options.
   * @return A Promise that resolves with the return value of onLockFn.
   */
  public async _withLock<T>(onLockFn: CallbackOnLock<T>, userOpts: FileLockRequiredOptions): Promise<T> {
    REQUIRE_DEBUG(() => includesAllKeysOf(userOpts, defaultFileLockOptions), 
      "The option remains unresolved.", InvalidOptions, { name: 'userOpts', props: { options: userOpts } } );
    // Reconstructs the options by combining the specified options with the internal state.
    const options = { ...userOpts } as AllOptions;
    this._prepare(options);
    return super._withLock<T>(onLockFn, options);
  }

  /**
   * @internal
   */
  protected get _isALiveHeartbeatTimer() {
    return this.#heartbeatTimer != null;
  }

  /**
   * @internal
   * Acquire the lock. 
   * In practice, if a lock is already held, wait for it to be released before acquiring the lock. 
   * Throw an error (exception) if the specified timeout is exceeded.
   * @param options  Lock options.
   */
  protected override async _acquire(options: AllOptions): Promise<void> {
    const tryResults = [] as { locked: boolean, reason: string, cause?: unknown }[];
    const tryRes = await retry(async () => {
      const res = await this.#tryLock(options);
      tryResults.push(res);
      return res;
    }, (result: TryResult) => !result.locked, {
      timeout: Date.now() + options.timeoutMs
    }, ExponentialDelay, {
      base: options.pollIntervalMs, max: 1000, factor: 1.2, jitterRatio: 0.2
    });

    if (tryRes?.locked) {
      this._logger.trace(`Acquired the lock(key: ${this._key})  at ${DateFormatter.format(new Date())}.`);
      return;
    }

    // Failed to acquire the lock
    const causesRaw = tryResults.filter(v => v.cause != null).map(v => v.cause)
    const lastRes = tryResults[tryResults.length - 1];
    const causes = causesRaw.slice(lastRes.reason === 'EHISTORY' ? -2 : -1);
    const props = {} as Record<string, unknown>;
    causes.length > 0 && (props.causes = causes);
    const lockErrorDetails = {
      EALREADYLOCKED: { message: 'The `lock file` already exists.', reason: 'ExistingLock' },
      EUPDATING: { message: 'The `lock file` already exists and may still be updating.', reason: 'Updating' },
      EINITIALIZING: { message: 'The `lock file` already exists and may still be initializing.', reason: 'Initializing' },
      EBROKEN: { message: 'The `lock file` already exists, but its metadata is invalid.', reason: 'InvalidMetadata' },
      EEXISTANDEIO: { message: 'The `lock file` already exists, but its validity could not be determined due to an I/O error.', reason: 'MetadataReadError' },
    } as const satisfies Record<string, { message: string, reason: string }>;
    const lockError = lockErrorDetails[lastRes.reason as keyof typeof lockErrorDetails];
    let err: Error | undefined;
    if (lockError) {
      props.reason = lockError.reason;
      err = new AlreadyLocked(lockError.message, { key: this._key, props });
    }
    else if (lastRes.reason === 'EHISTORY') {
      err = FileLockError.lockFailedDueToHistory(FileLockInternal.#historyPath, causes);
    }
    else {
      // v8 ignore else -- @preserve
      if (lastRes.reason === 'EIO' || lastRes.reason === 'ERMTEMP') {
        err = FileLockError.lockFailedDueToIO(this._key, causes);
      }
    }
    ENSURE_DEBUG(err != null, 'Unexpected lock failure reason. This may be a bug.',
      FileLockError, { code: 'EUNEXPECTED', props: { reason: lastRes.reason, cause: lastRes.cause } });
    throw err;
  }

  /**
   * @internal
   * Decrement lock counter.
   * And, when the counter becomes '0', release lock.
   * @param options   Lock options.
   */
  protected override async _decReantryCount(options: AllOptions): Promise<void> {
    try {
      await this.#removeSharer(options);
      const count = await this.#countSharer(options, "Failed to count the `lock sharer`.");
      if (count === 0) {
        await this.#releaseActually(options);
      }
    }
    catch (err) {
      // Forced release due to inability to perform normal release processing.
      await this.#releaseActually(options, false);
      const relfailed = new ReleaseFailed('', { key: this._key, props: { causes: [err] } });
      this._onError(relfailed, "release lock or decrement lock counter", options)
      throw relfailed;
    }
  }

  /**
   * @internal
   * Increment lock counter.
   * @param options   Lock options.
   */
  protected override async _incReantryCount(options: AllOptions): Promise<void> {
    await this.#addSharer(options);
  }

  /**
   * @internal
   * @abstract
   * A synchronous function that is called immediately 
   * after a lock callback completes or is cancelled (due to an error).
   * @returns 
   */
  protected _onDoneOrCancelled(_options: AllOptions): void {
    this.#stopHeartbeat();
  }

  /**
   * @internal
   * Handle errors that occur while locked.
   * @param err       Error instance.
   * @param operation Operation description
   * @param options   Lock options.
   * @param codeIfNon Error code.
   */
  protected override _onError(err: unknown, operation: string, options: AllOptions, codeIfNon: string = 'ELOCK') {
    this.#stopHeartbeat();
    return super._onError(err, operation, options, codeIfNon);
  }

  /**
   * @internal
   * Make advance preparations.
   * @param options Options
   */
  protected override _prepare(options: AllOptions): void {
    super._prepare(options);
    const dirPath       = FileLockInternal.#lockDir;
    const encodedKey    = this._key.replace(/[<>:/\\|?*]/g, () => '_').replace(/"/g, () => '');
    options._filePath   = path.join(dirPath, encodedKey + '.json');
    options._sharerDir  = path.join(dirPath, encodedKey + '.sharer');
    options._contextId  = options._filePath;  // Use the file path as the context ID 
                                              // to avoid issues caused by changes 
                                              // to the `lock directory` configuration.
    options._sharerLockIntervalMs = Math.max(options._sharerLockIntervalMs ?? 100, 100);
    options._sharerLocktimeoutMs = Math.max(options._sharerLocktimeoutMs ?? 5000, 0);
  }

  /**
   * @internal
   * Release lock. <br>
   * In practice, the counter is decremented, and the lock is released when it reaches zero.
   * @param options Lock options.
   */
  protected override async _release(options: AllOptions): Promise<void> {
    return this._decReantryCount(options);
  }

  /**
   * @internal
   * File or direcroty access with exclusive control.
   * @param name      File or directory path. 
   * @param methodCb  Callback function to access a file or directory.
   * @param options   Lock options.
   * @param errMsg    If error, a message to pass to `Error class`.
   */
  async #accessInfo<T>(name: string, methodCb: () => T, options: AllOptions, errMsg: string, retryMode: RetryMode = 'normal') {
    const retries = retryMode === 'no-retry' ? 0 : (retryMode === 'double' ? options.retriesOnIoErr * 2 : options.retriesOnIoErr);
    let result!: T;
    const res = await retry(() => {
      try {
        return result = methodCb();
      }
      catch (err) {
        this._logger.trace('IO error occuered.', err);
        return err;
      }
    }, (r) => r instanceof Error, { retries }, FixedDelay, { base: options.retryIoIntervalMs, jitterRatio: 0.2 });
    if (res instanceof Error) {
      throw new FileLockError(`${errMsg}(${res.message})`, {
        code: ('code' in res && res.code) as string,
        props: { path: name, causes: [res] } 
      });
    }
    return result;
  }

  /**
   * @internal
   * Adds the lock information to the history.
   * @param meta 
   * @param options Lock options.
   */
  async #addHistory(meta: FileLockMeta, options: AllOptions) {
    const maxEntries = FileLockInternal.#config.maxHistoryEntries;
    const dateTimeStr = DateFormatter.format(new Date());
    const historyFile = FileLockInternal.#historyPath;
    let contents = null;
    if (await this.#existsSync(historyFile, options, `Failed to check the existence of the history file.`)) {
      try { contents = await this.#readFileSync(historyFile, options, "Failed to read the history file."); }
      catch (_err) {/* do nothing */}
    }

    let history!: Record<string, { key: string, meta: FileLockMeta, options: AllOptions }>;
    try { history = contents ? JSON.parse(contents) : {}; }
    catch (err) { throw FileLockError.historyPasingFailed(historyFile, [err]); }

    history[dateTimeStr] = { key: this._key, meta, options };

    // Adjust to the maximum number.
    const keys = Object.keys(history);
    for ( let i = 0; i < keys.length - maxEntries; i++) {
      delete history[keys[i]];
    }

    //  Update history.
    await this.#writeFileSync(historyFile, history, options, "Failed to update the history file.");

    // Adjusting the number of history files
    const list = await this.#readdirSync(FileLockInternal.#historyDir, options);
    const names = list.filter(item => item.isFile()).map(item => item.name);
    if (names.length >= FileLockInternal.#config.maxHistoryFiles) {
      names.sort();
      for( let i = 0; i < names.length - FileLockInternal.#config.maxHistoryFiles; i++) {
        try {
          await this.#unlinkSync(path.join(FileLockInternal.#historyDir, names[i]), options, 'normal', `Failed to remove the history file.`);
        }
        // v8 ignore next
        catch (_e) {/* do nothing */};
      }
    };
  }

  /**
   * @internal
   * Add the lock owner as the initial sharer.
   * @param options Lock options.
   */
  async #addOwnerAs1stSharer(options: AllOptions): Promise<void> {
    const sharerDir = options._sharerDir;
    // There might be an old shared information directory, so delete the shared information.
    await this.#removeSharers(options);
    // Create the `lock sharer directory`
    await this.#mkdirSync(sharerDir, options, { recursive: true }, "Failed to create the `lock sharer directory`.");
    // Add myself as owner into the `lock sharer directory`
    return this.#addSharer(options);
  }

  /**
   * @internal
   * Add a `lock sharer`. 
   * The intention is to add a lock owner and a `lock sharer` designated as permitted for reentrant locking.
   * @param options Lock options.
   * @param msg     Message displayed upon an addition error.
   */
  async #addSharer(options: AllOptions, msg: string = "Failed to add the lock request to `lock sharer directory`.") {
    const sharerPath = path.join(options._sharerDir, options._sharerId);
    try {
      await this.#share(async () => await this.#writeFileSync(sharerPath, '', options), options);
    }
    catch (err) {
      throw new FileLockError(msg, {
        code: 'EIO', props: { key: this._key, sharerId: options._sharerId, causes: [err] }
      });
    }
  }

    /**
   * @internal
   * Determine whether a lock can be acquired and, if not, the reason why.
   * @param options Lock options.
   * @returns An object containing the lockability status, the reason, and the cause if locking is not possible.
   */
  async #assertLock(options: AllOptions) {
    // Get ticket to create `lock file`.
    let ticket;
    try {
      ticket = await this.#getTicket(options);
      // Since the temporary file could not be opened exclusively, it is determined that the lock is currently being updated.
      if (ticket === undefined) {
        return { ticket, reason: 'EUPDATING', 
          cause: 'Found a `temporary lock file`, so the `lock file` may still be updating.' };
      }
    }
    catch (err) {
      return { ticket: undefined, reason: 'EIO', cause: err };
    }

    // Create `lock file` or verify existing one lock information.
    try {
      // Open the `lock file` exclusively to check whether it can be locked.
      if (await this.#openLockFileExclusively(options)) return { ticket, reason: 'LOCKFILEOPENED' };
      
      // Unable to open the `lock file` exclusively (because the `lock file` already existed), so its validity is being checked.
      const info = await this.#getInfoIfExists(options);
      if (info.meta) {
        // Check validity based on the retrieved metadata.
        if (this.#isLockExpired(info.meta)) {
          // This lock is stale; therefore, it is lockable.
          return { ticket, reason: 'STALELOCK' }; 
        }
        else { 
          await ticket.release();
          return { ticket: undefined, reason: 'EALREADYLOCKED', cause: 'The `lock file` already exists.' }; 
        } 
      }
      else {
        // Unable to get metadata due to an invalid file or a file currently being created (empty file).
        const cause = info.cause ? info.cause : info.reason;
        // Verify the validity of this file according to the `invalidTtlMs` option.
        if ('invalidTtlMs' in options) {
          // v8 ignore else -- @preserve
          if (await this.#isStaleInvalidFile(options.invalidTtlMs, options)) {
            return { ticket, reason: 'STALEINVALID', cause };
          }
        }
        await ticket.release();
        // Returns the result of the non-lockable determination.
        let reason = info.reason;
        if (reason === 'ECOMPROMISED') reason = 'EBROKEN';
        else if (reason !== 'EINITIALIZING') reason = 'EEXISTANDEIO';
        return { ticket: undefined, reason, cause };
      }
    }
    catch (err) {
      // Just to be safe, I will check for cases where `FileLockError` is not raised, as that would be unexpected.
      REQUIRE_DEBUG(err instanceof FileLockError, 'An unexpected error was caught.', 
        FileLockError, { code: 'EUNEXPECTED', props: { cause: err} });
      await ticket.release();
      return { ticket: undefined, reason: 'EIO', cause: err };
    }
  }

  /**
   * @internal
   * Get the number of `lock sharer`s.
   * @param options Lock options.
   * @param msg     Message displayed upon an addition error.
   * @returns The number of `lock sharer`s.
   */
  async #countSharer(options: AllOptions, msg: string) {
    return (await this.#listSharer(options, msg)).length;
  }

  /**
   * @internal
   * Create the `lock file`.
   * @param options Lock options.
   */
  async #createLockFile(options: AllOptions, ticket: Ticket) {
    // Create the `lock file`.
    const now = Date.now();
    await this.#updateInfo(
      {
        // When this lock request becomes the lock owner, 
        // the optional `lock sharer` ID and optional owner ID are set to match `this._id`.
        ownerId: options._ownerId = options._sharerId = this._id, 
        expiresAt: now + options.ttlMs,
        heartbeatExpiresAt: this.#heartbeatExpiresAt = now + options.heartbeatTtlMs,
      },
      options,
      ticket
    );
  }

  /**
   * @internal
   * Check if the file exists.
   * @param options Lock options.
   */
  async #existsSync(path: string, options: AllOptions, msg = `check the existence of the file or directory.`) {
    return this.#accessInfo(path, () => fs.existsSync(path), options, msg);
  }

  /**
   * @internal
   * Get the lock information.<br>
   * This function assumes the existence of a valid `lock file`. <br>
   * Consequently, it throws an error (exception) if the file is missing, corrupted, or has a different owner. <br>
   * Whether or not to perform an ownership check can be controlled via an argument.   
   * @param options Lock options.
   * @param checkOwner  If `true`, check the `lock` owner and throw an error if the owner is someone else.
   * @returns Lock information object.
   */
  async #getInfo(options: AllOptions, checkOwner: boolean = true) {
    // `lock file` should exist.
    REQUIRE(await this.#existsSync(options._filePath, options), 'The `lock file` does not exist.', 
      LockCompromised, {key: this._key, props: { path: options._filePath } });

    const contents = await this.#readFileSync(options._filePath, options);
    if (contents.length === 0) {
      throw new FileLockError("Found an empty `lock file`. It should be a file currently undergoing a lock acquisition process.", {
        code: 'EINITIALIZING', props: { path: options._filePath }
      });
    }

    let meta: FileLockMeta;
    try {
      meta = JSON.parse(contents);
    }
    catch (err) {
      throw new LockCompromised(
        "Failed to parse the `lock file`, it is probably broken.",
        {key: this._key, props: { path: options._filePath, contents } });
    }

    VERIFY(checkOwner === false || options._ownerId == null || options._ownerId === meta.ownerId,
      "The `lock file` was overwritten by another lock.",
      LockCompromised,
      { key: this._key, props: { path: options._filePath, ownerId: options._ownerId, lockFileOwnerId: meta.ownerId } }
    );

    // Check contents.
    const check = (key: keyof FileLockMeta, type: string | ((v: unknown) => boolean), optional: boolean = false) => {
      if (key in meta) {
        if (
          (typeof type === 'string' &&  typeof meta[key] === type) ||
          (typeof type === 'function' && type(meta[key])         )
        ) return true;
      }
      else if (optional) return true;
      return false;
    };

    const checkItems = [
      { key: "ownerId", type: "string" }, 
      { key: "processId", type: "number", optional: true }, 
      { key: "parentProcessId", type: "number", optional: true }, 
      { key: "processArgv",         
        type: (v) => Array.isArray(v) && v.every(val => typeof val === 'string'),
        optional: true
       }, 
      { key: "expiresAt", type: "number" },
      { key: "heartbeatExpiresAt", type: "number" },
    ] as { key: keyof FileLockMeta, type: string | ((v: unknown) => boolean), optional?: boolean }[];

    const invalidProps: Record<string, unknown> = {};
    checkItems.forEach(v => {
      if (check(v.key, v.type, v.optional ?? false) === false) {
        invalidProps[v.key] = meta[v.key];
      }
    });
    if (Object.keys(invalidProps).length > 0) {
      throw new LockCompromised(`The lock information format is invalid.`,
        {key: this._key, props: { invalidProps, path: options._filePath } });
    }

    return meta;
  }

  /**
   * @internal
   * Get the lock information.
   */
  async #getInfoIfExists(options: AllOptions): Promise<{ meta: FileLockMeta | null, reason: string, exists: boolean, cause?: unknown }> {
    try {
      if (!(await this.#existsSync(options._filePath, options))) return { meta: null, reason: 'ENOENT', exists: false };
      return { meta: await this.#getInfo(options, false), reason: 'OK', exists: false };
    }
    catch (err) {
      const exists = await this.#existsSync(options._filePath, options);
      const ret = { meta: null, reason: 'EUNKNOWN', exists, cause: err };
      err instanceof Error && 'code' in err && (Object.assign(ret, { reason: String(err.code) }));
      return ret;
    }
  }

  /**
   * @internal
   * Factory for ticket object to create or update a `lock file`.
   * @param options User options.
   * @param retryIo I/O retry mode.
   * @param throwIfErr If `false`, no error is thrown.
   * @returns A ticket object if success to open('wx') the 'temporary lock file`., otherwise `undefined`.
   */
  async #getTicket(options: AllOptions, retryIo: RetryMode = 'normal', throwIfErr = true) {
    const tmpLockFile = options._filePath + '.tmp';
    let released = false;
    let confirmed = false;
    try {
      if (await this.#openLockFileExclusively(options, tmpLockFile, retryIo)) {
        return {
          confirm: async (meta: FileLockMeta) => {
            // v8 ignore else -- @preserve
            if (!confirmed) {
              REQUIRE(await this.#existsSync(tmpLockFile, options), 
                  "Not found the `temporary lock file`.",
                  FileLockError, { code: 'ENOENT', props: { key: this._key } }
              );
              // Write to a temporary file first.
              await this.#writeFileSync(tmpLockFile , meta, options, "Failed to write the `temporary lock file`.");
              // Replace the target file path with the temporary file (if the file already exists, it is overwritten atomically).
              await this.#renameSync(tmpLockFile , options._filePath, options, "Failed to rename the `temporary lock file`.");
              confirmed = true;
            }
          },
          release: async () => {
            // v8 ignore else -- @preserve
            if (!released) {
              if (await this.#existsSync(tmpLockFile, options)) {
                await this.#unlinkSync(tmpLockFile, options, 'double', "Failed to remove the `temporary lock file`.");
              }
              released = true;
            }
          },
        } as Ticket;
      }
    }
    catch (err) {
      // v8 ignore else
      if (throwIfErr) throw err;
    }
    return undefined;
  }
 
  /**
   * @internal
   * Whether the lock has expired.
   * @param options 
   */
  #isLockExpired(meta: FileLockMeta): boolean {
    this._logger.trace("The `lock file` contents in isLockExpired():", meta);
    const now = Date.now();
    const expired = meta.expiresAt <= now;
    const dead = meta.heartbeatExpiresAt <= now;
    this._logger.trace("expired:", expired, "dead:", dead);
    return expired && dead;
  }

  /**
   * @internal
   * Check the expiration time of the invalid `lock file`.
   * @param ttl     The elapsed time since the last update, used to determine the expiration.
   * @param options Lock options.
   * @returns True if expired or not found, false otherwise.
   */
  async #isStaleInvalidFile(ttl: number, options: AllOptions) {
    const stat = await this.#statSync(options._filePath, options);
    return stat === undefined ? true : Date.now() >= stat.mtimeMs + ttl;
  }

  /**
   * @internal
   * Get the list of `lock sharer`s.
   * @param options 
   * @param msg 
   * @returns 
   */
  async #listSharer(options: AllOptions, msg: string) {
    try {
      return (await this.#readdirSync(options._sharerDir, options)).
          filter(item => item.isFile() && item.name !== '.lock').
          map(item => path.join(options._sharerDir, item.name));
    }
    catch (err) {
      throw new FileLockError(msg, {
        code: 'EIO', props: { key: this._key, sharerDir: options._sharerDir, causes: [err] }
      });
    }
  }

  /**
   * @internal
   * Remove the file.
   * @param options Lock options.
   */
  async #mkdirSync(path: string, options: AllOptions, fsOpts: object = {}, msg = `Failed to create the directory.`) {
    return this.#accessInfo(path, () => fs.mkdirSync(path, fsOpts), options, msg);
  }

  /**
   * @internal
   * Execute termination processing.<br>
   * In the Windows version, this is not called upon forced termination (process.kill()), but the implementation is being retained.
   */
  #onExit(code: number | null | undefined, signal: NodeJS.Signals | null): void {
    this._onExit(code, signal);
  }

  /**
   * @internal
   * Open the `lock file` exclusively.
   * @param options Lock options.
   */
  async #openLockFileExclusively(options: AllOptions, path?: string, retryMode: RetryMode = 'normal') {
    try {
      await this.#openSyncExclusively(path || options._filePath, options, undefined, retryMode);
      return true;
    }
    catch (err) {
      let code = "EUNKNOWN";
      // Avoided `if` statements to address code coverage requirements.
      err instanceof Error && 'code' in err && (code = String(err.code));
      if (code  === 'EEXIST') return false;
      throw err;
    }
  }

  /**
   * @internal
   * Open the file for exclusive writing.
   */
  async #openSyncExclusively(path: string, options: AllOptions, msg = "Failed to create the file.", retryMode: RetryMode = 'normal') {
    return this.#accessInfo(path, () => { const fd = fs.openSync(path, 'wx'); fs.closeSync(fd); }, options, msg, retryMode);
  }

  /**
   * @internal
   * Read directory information.
   */
  async #readdirSync(path: string, options: AllOptions, msg = "Failed to read the direcroty.") {
    return this.#accessInfo(path, () => fs.readdirSync(path, { withFileTypes: true }), options, msg) as Promise<fs.Dirent<string>[]>;
  }

  /**
   * @internal
   * Read the file.
   */
  async #readFileSync(path: string, options: AllOptions, msg: string = "Failed to read the `lock file`.") {
    return this.#accessInfo(path, () => fs.readFileSync(path, 'utf8'), options, msg);
  }

  /**
   * @internal
   * Final unlock processing.
   */
  async #releaseActually(options: AllOptions, throwErr = true) {
    super._releaseSync(options);

    try {
      // Stop the heartbeat (must be stopped before deletion)
      this.#stopHeartbeat()
      // removes `lock file`, etc.
      await this.#removeLockFile(options);
    }
    catch (err) {
      if (throwErr) throw err;
    }

    options._ownerId = null;

    this._logger.trace(`Released the lock(key: ${this._key}) at ${DateFormatter.format(new Date())}`);
  }

  /**
   * @internal
   */
  async #removeFile(options: AllOptions) {
    await this.#rmSync(options._filePath, options, { force: true }, 'double', "Failed to remove the `lock file`.");
    await this.#rmSync(options._sharerDir, options, { force: true, recursive: true }, 'normal', "Failed to remove the `lock sharer directory`.");
  }

  /**
   * @internal
   * Remove the `lock file`.<br>
   *  - Modified during the process or corrupted ⇒ Do not delete<br>
   *  - Unable to read meta-information ⇒ Do not delete<br>
   *  - Unable to read due to an I/O error (during existence check, unlink, or read) ⇒ Do not delete<br>
   *  - Report the above errors properly—specifically, that the `lock file` could not be deleted due to the error!!<br>
   * In other words: delete only if the `lock file` exists, the metadata can be read, and the owner information matches expectations.
   */
  async #removeLockFile(options: AllOptions) {
    // Verify that metadata can be successfully retrieved (throw an exception if retrieval fails).
    await this.#getInfo(options, true);
    // Remove them, bacause it is my own file.
    await this.#removeFile(options);
  }

  /**
   * @internal
   * Remove `lock sharer`s.
   */
  async #removeSharers(options: AllOptions, sharers?: string[], msg: string = "Failed to remove `lock sharer`s.") {
    try {
      if (!(await this.#existsSync(options._sharerDir, options))) return;
      return await this.#share(async () => {
        sharers = sharers ?? await this.#listSharer(options, "Failed to get the list of `lock sharer`s.");
        for(let i = 0; i < sharers.length; i++) {
          await this.#unlinkSync(sharers[i], options);
        }
      }, options);
    }
    catch (err) {
      const props = { key: this._key, causes: [err] };
      throw new FileLockError(msg, { code: 'EIO', props });
    }
  }

  /**
   * @internal
   * Remove a sharer.
   */
  async #removeSharer(options: AllOptions, msg: string = "Failed to remove the lock request from the `lock sharer`."): Promise<void> {
    return this.#removeSharers(options, [path.join(options._sharerDir, options._sharerId)], msg);
  }

  /**
   * @internal
   * Rename file.
   */
  async #renameSync(oldPath: string, newPath: string, options: AllOptions, msg: string) {
    return this.#accessInfo(oldPath, () => fs.renameSync(oldPath, newPath), options, msg);
  }

  /**
   * @internal
   * Remove file.
   */
  async #rmSync(path: string, options: AllOptions, fsOpts: object = {}, retryMode: RetryMode = 'normal', msg = `Failed to remove the file or directory.`) {
    return this.#accessInfo(path, () => fs.rmSync(path, fsOpts), options, msg, retryMode);
  }

  /**
   * @interenal
   * Share the lock. <br>
   * It is intended to be called when the lock is acquired by the owner and when the lock is re-acquired.
   */
  async #share(operation: () => MaybePromise<void>, options: AllOptions/*, withLock: boolean = true*/): Promise<void> {
    const lockPath = path.join(options._sharerDir, '.lock');
    const res = await retry(async () => {
      try { await this.#openSyncExclusively(lockPath, options); return undefined; }
      catch (err) { return err; }
    }, (result: unknown) => result !== undefined, { 
      timeout: Date.now() + options._sharerLocktimeoutMs
    },  FixedDelay, {
      base: options._sharerLockIntervalMs, jitterRatio: 0.2,
    });

    if (res instanceof Error) throw Object.assign(res, { path: lockPath });
    
    // Exec operation
    try {
      await operation();
    }
    finally {
     await this.#rmSync(lockPath, options, { force: true });
    }
  }

  /**
   * @internal
   * Start heartbeat.
   */
  #startHeartbeat(options: AllOptions): void {
    REQUIRE_DEBUG(!this._isALiveHeartbeatTimer, 
      'Heartbeat multiple startup error. Possible bug.', 
      FileLockError, { code: 'EFILELOCK', props: { options } });

    this._logger.trace(`Start heartbeat(key: ${this._key}, ownerId: ${this._id}) at ${DateFormatter.format(new Date())}`);

    this.#heartbeatTimer = setInterval(() => {
      void (async () => {
        try {
          const shouldContinue = () => this._acquired && this._isAlreadyCancelled(options) === false;
          // v8 ignore next 2  -- @preserve
          if (shouldContinue() === false) {
            this.#stopHeartbeat();
          }
          else {
            await this.#updateHeartbeat(options);
            // Double-checking, just to be sure.
            // v8 ignore next  -- @preserve
            if (shouldContinue() == false) this.#stopHeartbeat();
          }
        }
        catch (err) {
          this._logger.trace(`Heartbeat update error at ${DateFormatter.format(new Date())}: ${err}`);
          this.#stopHeartbeat();
          this._onError(
            err,
            'updateHeartbeat',
            options
          );
        }
      })();
    }, options.heartbeatIntervalMs);
  }

  /**
   * @internal
   * Get the information about the given file path. 
   */
  async #statSync(path: string, options: AllOptions, msg = "Failed to get status of the file.") {
    return this.#accessInfo(path, () => fs.statSync(path, { throwIfNoEntry: false }), options, msg);
  }

  /**
   * @internal
   * Stop heartbeat.
   */
  #stopHeartbeat(): void {
    if (this.#heartbeatTimer) {
      clearInterval(this.#heartbeatTimer);
      this.#heartbeatTimer = null;
      this._logger.trace(`Stop heartbeat(key: ${this._key}, ownerId: ${this._id}) at ${DateFormatter.format(new Date())}`);
    }
  }

  /**
   * @internal
   * Attempt to acquire the lock; that is, create the `lock file`.
   */
  async #tryLock(options: AllOptions): Promise<TryResult> {
    if (this._acquired) return {locked: false, reason: 'EALREADYLOCKED'};

    const al = await this.#assertLock(options);
    // Check lockable, and if lockable, create lock key directry
    if (al.ticket === undefined) {
        return { locked: false, reason: al.reason, cause: al.cause };
    }

    // Create the `lock file`. 
    let lastErr;
    try {
      await this.#createLockFile(options, al.ticket);
      await this.#addOwnerAs1stSharer(options);
    }
    catch (err) {
      lastErr = err;
      try {
        // An empty `lock file` should already have been created, so delete it.
        await this.#removeFile(options);
      }
      catch (err2) {
        // Give up on the I/O error here.
        lastErr = err2;
      }

      let reason = lastErr instanceof FileLockError && String(lastErr.code);
      if (reason !== 'EHISTORY' && reason !== 'ERMTEMP') reason = 'EIO';
      //const reason = lastErr instanceof FileLockError && lastErr.code === 'EHISTORY' ? 'EHISTORY' : 'EIO';
      return { locked: false, reason, cause: lastErr };
    }

    // Start the heartbeat.
    this.#startHeartbeat(options);

    super._acquireSync(options);

    return { locked: true, reason: 'ACQUIRED' };
  }

  /**
   * @internal
   * Remove the file.
   */
  async #unlinkSync(path: string, options: AllOptions, retryMode: RetryMode = 'normal', msg = `Failed to remove the file.`) {
    return this.#accessInfo(path, () => fs.unlinkSync(path), options, msg, retryMode);
  }

  /**
   * @internal
   * Update heartbeat.
   */
  async #updateHeartbeat(options: AllOptions) {
    // v8 ignore else -- @preserve
    if (this._isALiveHeartbeatTimer && !this.#heatbeatUpdating) {
      this.#heatbeatUpdating = true;
      let ticket: Ticket | undefined;
      try {
        ticket = await retry(async () => {
          return this._isALiveHeartbeatTimer ? await this.#getTicket(options, 'no-retry', false) : undefined;
        }, (result: Ticket | undefined) => result === undefined, {
          timeout: Math.round(this.#heartbeatExpiresAt - (options.heartbeatIntervalMs + options.heartbeatRetryIntervalMs * 2))
        }, FixedDelay, {
          base: options.heartbeatRetryIntervalMs, jitterRatio: 0.2
        });

        // Check _isALiveHeartbeatTimer just in case.
        // v8 ignore else  -- @preserve
        if (!this._isALiveHeartbeatTimer || ticket === undefined) return;

        // Metadata retrieval and update (errors—specifically fatal errors such as corruption or I/O errors—are reported as-is)
        const meta = await this.#getInfo(options);
        this.#heartbeatExpiresAt = meta.heartbeatExpiresAt = Date.now() + options.heartbeatTtlMs;
        // Check _isALiveHeartbeatTimer just in case.
        // v8 ignore next  -- @preserve
        if (!this._isALiveHeartbeatTimer) return;
        await this.#updateInfo(meta, options, ticket);
        this._logger.trace(`Update heartbeat(key: ${this._key}, ownerId: ${this._id}) at ${DateFormatter.format(new Date(meta.heartbeatExpiresAt))}`);
      }
      finally {
        await ticket?.release();
        this.#heatbeatUpdating = false;
      }
    }
  }

  /**
   * @internal
   * Update the lock information.
  */
  async #updateInfo(meta: FileLockMeta, options: AllOptions, ticket: Ticket) {
    // For debug
    if (this._isDebug) {
      Object.assign(
        meta, 
        { 
          processId: process.pid,
          parentProcessId: process.ppid,
          processArgv: process.argv,
          callStack : getCallStack()
        }
      );
    }

    try {
      await ticket.confirm(meta);
    }
    catch (err) {
      try {
        await ticket.release();
      }
      catch (err2) {
        // Preserve the original cleanup failure; the caller will wrap it as a generic I/O lock acquisition error.
        this._logger.trace("Failed to remove the `temporary lock file`.", err2);
        let causes: unknown[];
        err2 instanceof FileLockError && 
          (causes = ('causes' in err2 ? err2.causes : []) as unknown[]).unshift(err) &&
          Object.assign(err2, { causes });
        throw err2;
      }
      throw err;
    }

    if (FileLockInternal.#config.history || this._isDebug) {
      await this.#addHistory(meta, options);
    }
  }

  /**
   * @internal
   * Write the file.
   * @param options Lock options.
   */
  async #writeFileSync(path: string, data: unknown, options: AllOptions, msg: string = "Failed to write the `lock file`.") {
    const str = JSON.stringify(data, null , "  ");
    return this.#accessInfo(path, () => fs.writeFileSync(path, str, 'utf8'), options, msg);
  }
}

// Initialize
FileLockInternal._initialize();

export { type CallbackOnLock };