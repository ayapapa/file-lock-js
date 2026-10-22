import path from 'node:path';
import fs from 'node:fs';

import { Cache } from './Cache.ts';
import { DateFormatter } from '@ayapapa-npm/date-formatter-js';
import { ENSURE_DEBUG, REQUIRE, REQUIRE_DEBUG, VERIFY } from './Contracts.ts';
import { LockBase, type CallbackOnLock } from "./LockBase.ts";
import { defaultFileLockOptions, minimumFileLockOptions, type FileLockRequiredOptions, type FileLockOptions } from './FileLockOptions.ts';
import { type FileLockInternalState } from './FileLockInternalState.ts';
import { FileLockOptionsResolver } from "./FileLockOptionsResolver.ts";
import { FileLockError, LockCompromised, LockDirectoryCreationFailed, LockDirectoryStatFailed} from './FileLockErrors.ts';
import { type AllOptions as AllOptionsT } from './AllOptions.ts';
import { defaultFileLockConfig, type FileLockConfig } from './FileLockConfig.ts';
import { getCallStack, includesAllKeysOf, sleepAsync, sleepSync, typedKeys } from './Util.ts'
import { type FileLockMeta } from './FileLockMeta.ts'
import { AlreadyLocked, InvalidOptions, ReleaseFailed } from './LockBaseErrors.ts';

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

/**
 * @internal
 * ロックファイルの生成・更新のためのチケット 
 */
class Ticket {

  static get(owner: FileLock, options: AllOptions) {
    const tmpLockFile = options._filePath + '.tmp';
    if (owner['_openLockFileExclusively'](options, tmpLockFile )) {
      return new Ticket(owner, tmpLockFile, options);
    }
    else {
      console.log(`###### COULDN'T GET TICKET ######(${DateFormatter.format()})`)
      return undefined;
    }
  }
  
  #path: string;
  #owner: FileLock;
  #options: AllOptions;
  #released = false;

  constructor(owner: FileLock, path: string, options: AllOptions) {
    this.#owner = owner;
    this.#path = path;
    this.#options = options;
  }

  release(): void {
    if (this.#released) return;
    this.#released = true;
    if (this.#owner['_existsSync'](this.#path, this.#options)) {
      this.#owner['_unlinkSync'](this.#path, this.#options, 'double', "Failed to remove the temporary `lock file`.");
    }
  }

  verify = () => this.#owner[`_existsSync`](this.#path, this.#options);


  confirm(meta: FileLockMeta) {
    // Write to a temporary file first.
    this.#owner['_writeFileSync'](this.#path , meta, this.#options, "Failed to write the temporary `lock file`.");
    // Replace the target file path with the temporary file (if the file already exists, it is overwritten atomically).
    this.#owner['_renameSync'](this.#path , this.#options._filePath, this.#options, "Failed to rename the temporary `lock file`.");
  }

}

/**
* File locking. 
* Acquires a lock by creating a file derived from the specified key, executes the provided callback, and then releases the lock (by deleting the created file). 
* While the file exists, no other lock can be acquired for the same key. 
* Settings such as `timeoutMs` allow for waiting until an unreleased lock is freed. 
*/
export class FileLock extends LockBase<FileLockAllOptions, FileLockInternalState> {
 
  /** 
   * Static fields 
   */

  /**
   * @internal
   * FileLock instance cache associated with a key. 
   * Uses `LRUCache`, providing features to set a maximum cache size and prune (remove) infrequently accessed elements.
   */
  private static _cache: Cache<string, FileLock> | null;

  /** 
   * @internal
   * Current configurations.
   */
  static #config: Required<FileLockConfig> = FileLock.getDefaultConfig();

  /**
   * @internal
   * The history directory path.
   */
  static #historyDir = path.join(FileLock._getLockDirPath(), 'history');

  /**
   * @internal
   * The history file name.
   */
  static #historyId: string = DateFormatter.format(new Date(), "yyyyMMdd-HHmmss.fff") + '-' + crypto.randomUUID().slice(0, 12);

  /**
   * @internal
   * The history file name.
   */
  static #historyName: string = `${FileLock.#historyId}.json`;

  /**
   * @internal
   * The history file path.
   */
  static #historyPath = path.join(FileLock.#historyDir, FileLock.#historyName);

  /**
   * @internal
   * The `lock directory`
   */
  static #lockDir = FileLock._getLockDirPath();

  /** 
   * Static methods
   */

  /** 
   * @internal
   * Initialize.
   */
  public static _initialize() {
    FileLock.resetConfig();
    FileLock._addOnExit(FileLock.#onExitFn);
  }

  /** Get current configurations. */
  public static getConfig(): Required<FileLockConfig> {
    return FileLock._copyConfig(FileLock.#config);
  }

  /** Get default configurations. */
  public static getDefaultConfig(): Required<FileLockConfig> {
    return FileLock._copyConfig(defaultFileLockConfig);
  }

  /**
   * Get default options(`FileLockOptions`).
   * @returns Deault options.
   */
  public static getDefaultOptions(): FileLockRequiredOptions {
    return { ...defaultFileLockOptions };
  }

  /**
   * Get the history informations.
   * @returns Returns the history permission flag, history identifier, history file path, and process identification.
   */
  public static getHistoryInfo(): Readonly<{
    historyEnabled: boolean, 
    historyId: string, 
    historyPath: string, 
    processId: number 
  }> {
    return {
      historyEnabled: FileLock.#config.history,
      historyId: FileLock.#historyId,
      historyPath: FileLock.#historyPath,
      processId: process.pid,
    }
  }

  /** Resets the current settings to their default values. */
  public static resetConfig(): void {
    FileLock.setConfig(FileLock.getDefaultConfig());
  }

  /**
   * Set configurations.<br>
   * Overwrite part of the current settings. 
   * At the same time, the cache is cleared.
   * @param config  Lock configurations. 
   */
  public static override setConfig(config: FileLockConfig): void {
    super.setConfig(config);

    const dConf = Object.assign(FileLock._copyConfig(config), LockBase._config);
    if (dConf.cacheTtlMs != null) dConf.cacheTtlMs = Math.max(dConf.cacheTtlMs, 10000);
    if (dConf.cacheMaxNum != null) dConf.cacheMaxNum  = Math.max(dConf.cacheMaxNum, 0);
    if (dConf.maxHistoryEntries != null) dConf.maxHistoryEntries = Math.max(dConf.maxHistoryEntries, 0);
    if (dConf.maxHistoryFiles != null) dConf.maxHistoryFiles = Math.max(dConf.maxHistoryFiles, 0);

    // If defaultOptions is specified, resolve it.
    if (dConf.defaultOptions) {
      dConf.defaultOptions = new FileLockOptionsResolver(dConf.defaultOptions, minimumFileLockOptions).getOptions();
    }
    FileLock.#config = { ...FileLock.getConfig(), ...dConf };

    // chache
    this._cache?.clear();
    if (FileLock.#config.cacheMaxNum === 0) FileLock.#config.cache = false;
    // If cache is enabled, (Re)create cache.
    if (FileLock.#config.cache) {
      FileLock._cache = new Cache<string, FileLock>({
        max: FileLock.#config.cacheMaxNum,
        ttlMs: FileLock.#config.cacheTtlMs,
      });
    }
    // or set null to chache.
    else {
      FileLock._cache = null;
    }

    // `lock directory`
    FileLock.#lockDir = FileLock._getLockDirPath();

    // history
    FileLock.#historyDir =  path.join(FileLock.#lockDir, 'history');
    //if (fs.existsSync(FileLock.#historyDir) === false) {
      fs.mkdirSync(FileLock.#historyDir, { recursive: true });
    //}
    FileLock.#historyPath =  path.join(FileLock.#historyDir, FileLock.#historyName);
  }

  /**
   * Acquires a lock for the specified key, executes the function `onLockFn` under exclusive control, 
   * and returns a Promise that resolves with the return value of `onLockFn` after the lock is released. 
   *
   * @param key       Lock key.
   * If the specified key contains characters that are invalid for a file path, 
   * it is converted into a valid file path by replacing those characters with underscores 
   * and removing double quotation marks.
   * @param onLockFn  Callback function to execute while the lock is held.
   *                  Both synchronous and asynchronous functions can be specified.
   * @param options   Lock options.
   * @return A Promise that resolves with the return value of onLockFn.
   */
  public static async withLock(key: string, onLockFn: CallbackOnLock, options: FileLockOptions  = {}): Promise<unknown> {
    REQUIRE(typeof key === 'string' && key !== '', '`key` must be specified as a non-empty string.', InvalidOptions, { name: 'key' });

    // If defaultOptions is specified in the config, it will be used as the default options.
    const defaultOpts: FileLockRequiredOptions = { ...FileLock.getDefaultOptions(), ...FileLock.#config.defaultOptions };

    // Resolve options.
    const rOpt = new FileLockOptionsResolver(options, minimumFileLockOptions, defaultOpts).getRequiredOptions();

    // For testing
    //FileLock._lastOptions = rOpt;
    
    return FileLock._getLock(key).withLock(onLockFn, rOpt);
  }

  /**
   * @internal
   * Get `cache` instance. <br>
   * It is set to `private` for testing purposes.
   */
/*  private static _getCache(): Cache<string, FileLock> | null {
    return FileLock._cache;
  }
*/
  /**
   * @internal
   * Get `lock` instance. <br>
   * It is set to `private` for testing purposes.
   * @param key Lock key. 
   */
  private static _getLock(key: string): FileLock {
    let lock = this._cache?.get(key);
    if (!lock) {
      lock = new FileLock(key);
      this._cache?.set(key, lock);
    }
    return lock;
  }
  
  /**
   * @internal
   * Get a directory path for storing files containing lock information.<br>
   * If it has been specified, use this as the top priority.<br>
   * The directory is determined based on the following order of priority:<br>
   *  1. Specified via an `FileLockConfig` (user's explicit intent)
   *  2. `process.cwd()` (current working directory at runtime)
   * Note: In cases where the directory is explicitly specified (1 or 2 above), an error occurs if the specified directory does not exist and its creation fails.<br>
   * It is set to `private` for testing purposes.
   * @returns A directory path for storing files containing lock information.
   */
  private static _getLockDirPath() {
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

    const candies = {
      'config.lockDirectory' : FileLock.#config.lockDirectory,
      'process.cwd()': path.join(process.cwd(), '.lock'),
    };

    // Check whether the directory is one specified by the user.
    const isSpecified = (i: number) => i === 0;

    // Create a `lock directory`.
    let candidates: string = '';
    const keys = typedKeys(candies);
    for(let i = 0; i < keys.length; i++) {
      const dir = candies[keys[i]];
      if (!dir) continue;
      candidates += "\n" + `- ${dir}`;
      try {
        if (existsDir(dir) === false) mkdir(dir);
        return dir;
      }
      catch (err) {
        if (isSpecified(i)) throw err;
        continue;
      }
    };
    // Failed to create `lock directory`.
    throw new LockDirectoryCreationFailed(
      "Failed to create the `lock directory`." +
      "\nAttempted to locate and create it in the following order:" +
      candidates,
      { props: { candidates } }
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
    FileLock._logger.trace("Exited by", { code, signal });
    FileLock._cache?.forEach(value => value.#onExit(code, signal));
  }

  /** 
   * Instance fields.
   */

  /**
   * @internal
   * Heartbeat timer id 
   */
  private _heartbeatTimer: NodeJS.Timeout | null = null;

  /**
   * @internal
   * Whether or not a heartbeat update is in progress.
   */
  #heatbeatUpdating = false;

  /** 
   * Instance methods.
   */

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
   * Acquire the lock. 
   * In practice, if a lock is already held, wait for it to be released before acquiring the lock. 
   * Throw an error (exception) if the specified timeout is exceeded.
   * @param options  Lock options.
   */
  protected override async _acquire(options: AllOptions): Promise<void> {
    const start = Date.now();
    const timeoutTime = start + options.timeoutMs;
    const pollIntervalMs = options.pollIntervalMs;
    const tryResults = [] as { locked: boolean, reason: string, cause?: unknown }[];
    do {
      const tryRes = await this.#tryLock(options);
      if (tryRes.locked) {
        this._logger.trace(`Acquired the lock(key: ${this._key})  at ${DateFormatter.format(new Date())}.`);
        return;
      }
      tryResults.push(tryRes)
      if (Date.now() >= timeoutTime) break;
      await sleepAsync(pollIntervalMs);
      // ignore the eslint warning about the infinite loop, as it is controlled by the timeout condition.
      // eslint-disable-next-line no-constant-condition
    } while (true);

    const causesRaw = tryResults.filter(v => v.cause != null).map(v => v.cause)
    const lastRes = tryResults[tryResults.length - 1];
    const causes = (() => {
      if (lastRes.reason === 'EHISTORY') return causesRaw.slice(-2);
      return causesRaw.slice(-1);
    })();
    const props = {} as Record<string, unknown>;
    causes.length > 0 && (props.causes = causes);
    const newAlreadyLocked = (msg: string, reason: string) => {
      props.reason = reason;
      return new AlreadyLocked(msg, { key: this._key, props });
    }
    // Couldn't acquire the lock
    const errIns = {
      'EALREADYLOCKED': () => newAlreadyLocked('The `lock file` already exists.', 'ExistingLock'),
      'EUPDATING'     : () => {
        return newAlreadyLocked('The `lock file` already exists and may still be updating.', 'Updating'); 
      },
      'EINITIALIZING' : () => newAlreadyLocked('The `lock file` already exists and may still be initializing.', 'Initializing'), 
      'EBROKEN'       : () => newAlreadyLocked('The `lock file` already exists, but its metadata is invalid.', 'InvalidMetadata'),
      'EEXISTANDEIO'  : () => newAlreadyLocked('The `lock file` already exists, but its validity could not be determined due to an I/O error.', 'MetadataReadError'),
      'EIO'           : () => FileLockError.lockFailedDueToIO(this._key, causes),
      'EHISTORY'      : () => FileLockError.lockFailedDueToHistory(FileLock.#historyPath, causes),
    } as const as Record<string, () => void>;

    const err = errIns[lastRes.reason] && errIns[lastRes.reason]();
    ENSURE_DEBUG(err != null, 'Unexpected lock failure reason. This may be a malfunction.',
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
      const count = this.#countSharer(options, "Failed to count the `lock sharer`.");
      if (count === 0) {
        this.#releaseActually(options);
      }
    }
    catch (err) {
      // Forced release due to inability to perform normal release processing.
      this.#releaseActually(options, false);
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
    // ディレクトリ指定はsetConfig()で変更される可能性があるため、各パスはここで構築する。
    const dirPath       = FileLock.#lockDir;
    const encodedKey = this._key.replace(/[<>:/\\|?*]/g, () => '_').replace(/"/g, () => '');
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
    await this._decReantryCount(options);
  }

  /**
   * @internal
   * Acquires a lock, executes the function `onLockFn` under exclusive control, 
   * and returns a Promise that resolves with the return value of `onLockFn` after the lock is released. 
   * @param onLockFn  Callback function to execute while the lock is held.
   * @param options   Lock options.
   * @return A Promise that resolves with the return value of onLockFn.
   */
  private async withLock(onLockFn: CallbackOnLock, userOpts: FileLockRequiredOptions): Promise<unknown> {
    REQUIRE_DEBUG(() => includesAllKeysOf(userOpts, FileLock.getDefaultOptions()), 
      "The option remains unresolved.", InvalidOptions, { name: 'userOpts', props: { options: userOpts } } );

    // Reconstructs the options by combining the specified options with the internal state.
    const options = { ...userOpts } as AllOptions;
    this._prepare(options);

    return super._withLock(onLockFn, options);
  }

  /**
   * @internal
   * File or direcroty access with exclusive control.
   * @param name      File or directory path. 
   * @param methodCb  Callback function to access a file or directory.
   * @param options   Lock options.
   * @param errMsg    If error, a message to pass to `Error class`.
   */
  #accessInfo(name: string, methodCb: () => unknown, options: AllOptions, errMsg: string, retryMode: 'normal' | /*'no-retry' |*/ 'double' = 'normal'): unknown {
    const retries = /*retryMode === 'no-retry' ? 0 :*/ (retryMode === 'double' ? options.retriesOnIoErr * 2 : options.retriesOnIoErr);
    const retryIntervalMs = options.retryIoIntervalMs;
    const causes = [] as unknown[];
    for (let i = 0; i <= retries; i++) {
      try {
        return methodCb();
      }
      catch (err) {
        causes.push(err);
        this._logger.trace('IO error occuered.', err);
        if (i < retries) {
          sleepSync(retryIntervalMs);
          continue;
        }
        let detailMsg: string = '', code: string = 'EFILELOCK';
        // Avoid `if` statements to address coverage issues.
        err instanceof Error && 
        (detailMsg = `(${err.message})`) && 
        (code = ('code' in err && err.code) as string);

        const finalCause = [causes[causes.length - 1]];
        throw new FileLockError(`${errMsg}${detailMsg}`, {code, props: { path: name, causes: finalCause } });
      }
    }
    // v8 ignore next  -- @preserve
    return; // Added for ESLint compatibility.
  }

  /**
   * @internal
   * Adds the lock information to the history.
   * @param meta 
   * @param options Lock options.
   */
  #addHistory(meta: FileLockMeta, options: AllOptions): void {
    const maxEntries = FileLock.#config.maxHistoryEntries;
    const dateTimeStr = DateFormatter.format(new Date());
    const _add = () => {
      const historyFile = FileLock.#historyPath;
      let contents = null;
      if (this._existsSync(historyFile, options, `Couldn't check the existence of the history file.`)) {
        try {
          contents = this.#readFileSync(historyFile, options, "Couldn't read the history file.");
        }
        catch (err) {
          ; // do nothing
        }
      }

      let history!: Record<string, { key: string, meta: FileLockMeta, options: AllOptions }>;
      try {
        history = contents ? JSON.parse(contents) : {};
      }
      catch (err) {
        throw FileLockError.historyPasingFailed(historyFile, [err]);
      }

      history[dateTimeStr] = { key: this._key, meta, options };

      // Adjust to the maximum number.
      const keys = Object.keys(history);
      for ( let i = 0; i < keys.length - maxEntries; i++) {
        delete history[keys[i]];
      }

      //  Update history.
      this._writeFileSync(historyFile, history, options, "Couldn't update the history file.");

      // Adjusting the number of history files
      const list = fs.readdirSync(FileLock.#historyDir, { withFileTypes: true });
      const names = list.filter(item => item.isFile()).map(item => item.name);
      if (names.length >= FileLock.#config.maxHistoryFiles) {
        names.sort();
        for( let i = 0; i < names.length - FileLock.#config.maxHistoryFiles; i++) {
          this._unlinkSync(path.join(FileLock.#historyDir, names[i]), options, 'normal', `Couldn't remove the history file.`);
        }
      };
    };

    _add();
  }

  /**
   * @internal
   * Add the lock owner as the initial sharer.
   * @param options Lock options.
   */
  async #addOwnerAs1stSharer(options: AllOptions): Promise<void> {
    const sharerDir = options._sharerDir;
    // Create the `lock sharer directory`
    this.#mkdirSync(sharerDir, options, { recursive: true }, "Couldn't create the `lock sharer directory`.");
    // There might be an old shared information directory, so delete the shared information.
    await this.#removeSharers(options);
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
      await this.#share(() => this._writeFileSync(sharerPath, '', options), options);
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
  #assertLock(options: AllOptions): { ticket: Ticket | undefined, reason: string, cause?: unknown } {
    // Get ticket to create `lock file`.
    let ticket;
    try {
      ticket = Ticket.get(this, options);
      /*
      //Open the temporary `lock file` exclusively to check whether locking is possible.
      const tmpLockFile = options._filePath + '.tmp';
      const tmpCreated = this._openLockFileExclusively(options, tmpLockFile);
      */
      // Since the temporary file could not be opened exclusively, it is determined that the lock is currently being updated.
      if (ticket === undefined/*tmpCreated === false*/) {
        return { ticket, reason: 'EUPDATING', 
          cause: 'Found a temporary `lock file` was found, so the `lock file` may still be updating.' };
      }
    }
    catch (err) {
      return { ticket: undefined, reason: 'EIO', cause: err };
    }

    // Create `lock file` or verify existing one lock information.
    try {
      // Open the `lock file` exclusively to check whether it can be locked.
      const opened = this._openLockFileExclusively(options);
      if (opened) {
        return { ticket, reason: 'LOCKFILEOPENED' };
      }
      
      // Unable to open the `lock file` exclusively (because the `lock file` already existed), so its validity is being checked.
      const info = this.#getInfoIfExists(options);
      if (info.meta) {
        // Check validity based on the retrieved metadata.
        if (this.#isLockExpired(info.meta)) {
          // This lock is stale; therefore, it is lockable.
          return { ticket, reason: 'STALELOCK' }; 
        }
        else { 
          // Since the locked information is still valid, delete the created temporary file 
          // and return an indication that locking is not possible.
          ticket.release();
          //tmpCreated && this._unlinkSync(tmpLockFile, options, 'double', "Failed to remove the temporary `lock file`.");
          return { ticket: undefined, reason: 'EALREADYLOCKED', cause: '`lock file` already exists.' }; 
        } 
      }
      else {
        // Unable to get metadata due to an invalid file or a file currently being created (empty file).
        const cause = info.cause ? info.cause : info.reason;
        // Verify the validity of this file according to the `invalidTtlMs` option.
        if ('invalidTtlMs' in options) {
          if (this.#isStaleInvalidFile(options.invalidTtlMs, options)) {
            // The file is determined to be stale; therefore, it is lockable.
            return { ticket, reason: 'STALEINVALID', cause };
          }
        }

        // Determined that the existing `lock file` is valid, so the lock cannot be acquired. 
        // Therefore, delete the created temporary file.
        ticket.release();
        // tmpCreated && this._unlinkSync(tmpLockFile, options, 'double', "Failed to remove the temporary `lock file`.");

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
      // Unable to determine whether locking is possible due to an I/O error; 
      // therefore, it is determined that locking is not possible.
      ticket.release();
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
  #countSharer(options: AllOptions, msg: string): number {
    return this.#listSharer(options, msg).length;
  }

  /**
   * @internal
   * Create the `lock file`.
   * @param options Lock options.
   */
  #createLockFile(options: AllOptions, ticket: Ticket): void {
      // Create the `lock file`.
    this.#updateInfo(
      {
        // When this lock request becomes the lock owner, 
        // the optional `lock sharer` ID and optional owner ID are set to match `this._ownerId`.
        ownerId: options._ownerId = options._sharerId = this._ownerId, 
        expirationTime: Date.now() + options.ttlMs,
        heartbeatTtlMs: options.heartbeatTtlMs,
        lastHeartbeatAt: Date.now(),
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
  private _existsSync(path: string, options: AllOptions, msg = `check the existence of the file or directory.`): boolean {
    return this.#accessInfo(
      path,
      () => fs.existsSync(path), 
      options, 
      msg
    ) as boolean;
  }

  /**
   * @internal
   * Get the lock information.<br>
   * This function assumes the existence of a valid `lock file`. <br>
   * Consequently, it throws an error (exception) if the file is missing, corrupted, or has a different owner. <br>
   * Whether or not to perform an ownership check can be controlled via an argument.   
   * @param options Lock options.
   * @returns Lock information object.
   */
  #getInfo(options: AllOptions, checkOwner: boolean = true): FileLockMeta {
    // `lock file` should exist.
    REQUIRE(this._existsSync(options._filePath, options), 'The `lock file` does not exist.', 
      LockCompromised, {key: this._key, props: { path: options._filePath } });

    const contents = this.#readFileSync(options._filePath, options);
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
        "Couldn't parse the `lock file`, it is probably broken.",
        {key: this._key, props: { path: options._filePath, contents } });
    }

    VERIFY(checkOwner === false || options._ownerId == null || options._ownerId === meta.ownerId,
      "The `lock file` was overwritten by another lock.",
      LockCompromised,
      { key: this._key, props: { path: options._filePath, ownerId: options._ownerId, lockFileOwnerId: meta.ownerId } }
    );

    // Check contents.
    const check = (key: keyof FileLockMeta, type: string | ((v: unknown) => boolean), optional: boolean = false) => {
      // True if the key exists and the type check is successful.
      if (key in meta) {
        if (
          (typeof type === 'string' &&  typeof meta[key] === type) ||
          (typeof type === 'function' && type(meta[key])         )
        ) return true;
      }
      // If optional, then true.
      else if (optional) return true;
      // Otherwise false.
      return false;
    };

    const checkItems = [
      { key: "ownerId", type: "string" }, 
      { key: "processId",         type: "number", optional: true }, 
      { key: "parentProcessId",   type: "number", optional: true }, 
      { key: "processArgv",         
        type: (v) => Array.isArray(v) && v.every(val => typeof val === 'string'),
        optional: true
       }, 
      { key: "expirationTime",    type: "number" },
      { key: "heartbeatTtlMs",    type: "number" },
      { key: "lastHeartbeatAt",   type: "number" },
      //{ key: "counter",           type: "number" },
    ] as { key: keyof FileLockMeta, type: string | ((v: unknown) => boolean), optional?: boolean }[];

    const checkAll = () => {
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
    }

    checkAll();

    return meta;
  }

  /**
   * @internal
   * Get the lock.<br>
   * This function returns the lock as-is only when valid information 
   * is successfully retrieved (it does not perform an owner check).<br>
   * In the case of an invalid file, it throws an error if `throwErr` is `true`; 
   * otherwise, it returns `null`.
   * @param options Lock options.
   * @returns null if not exist, or the contents as object.
   */
  #getInfoIfExists(options: AllOptions/*, throwErr: boolean = false*/): { meta: FileLockMeta | null, reason: string, exists?: boolean, cause?: unknown } {
    try {
      if (!this._existsSync(options._filePath, options)) return { meta: null, exists: false, reason: 'ENOENT' };
      return { meta: this.#getInfo(options, false), reason: 'OK' };
    }
    catch (err) {
      // ここで、あるはずのロックファイルが無いケースを観測したため、改めて存在を確認
      const exists = this._existsSync(options._filePath, options);
      const ret = { meta: null, reason: 'EUNKNOWN', exists, cause: err };
      err instanceof Error && 'code' in err && (Object.assign(ret, { reason: String(err.code) }));
      return ret;
    }
  }

  /**
   * @internal
   * Whether the lock has expired.
   * @param options 
   */
  #isLockExpired(meta: FileLockMeta): boolean {
    this._logger.trace("The `lock file` contents in isLockExpired():", meta);
    const expired = meta.expirationTime <= Date.now();
    const dead = meta.lastHeartbeatAt + meta.heartbeatTtlMs <= Date.now();
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
  #isStaleInvalidFile(ttl: number, options: AllOptions): boolean {
    const stat = this.#statSync(options._filePath, options);
    return stat === undefined ? true : Date.now() >= stat.mtimeMs + ttl;
  }

  /**
   * @internal
   * Get the list of `lock sharer`s.
   * @param options 
   * @param msg 
   * @returns 
   */
  #listSharer(options: AllOptions, msg: string): string[] {
    try {
      return this.#readdirSync(options._sharerDir, options).
          filter(item => item.isFile() && item.name !== '.lock').
          map(item => item.name);
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
  #mkdirSync(path: string, options: AllOptions, fsOpts: object = {}, msg = `Couldn't create the directory.`): void {
    this.#accessInfo(
      path,
      () => fs.mkdirSync(path, fsOpts),
      options,
      msg
    );
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
  _openLockFileExclusively(options: AllOptions, path?: string): boolean {
    try {
      this.#openSyncExclusively(path || options._filePath, options);
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
   * @param path 
   * @param options 
   * @param msg 
   * @param noRetry 
   */
  #openSyncExclusively(path: string, options: AllOptions, msg = "Couldn't create the file."/* noRetry: boolean = false*/): void {
    this.#accessInfo(
      path,
      () => { const fd = fs.openSync(path, 'wx'); fs.closeSync(fd); },
      options, 
      msg,
      //noRetry ? 'no-retry' : 'normal'
    )
  }

  /**
   * @internal
   * @param path    Directory path.
   * @param options Lock options.
   * @param msg     Error message. 
   * @returns An array of error directory information.
   */
  #readdirSync(path: string, options: AllOptions, msg = "Couldn't read the direcroty."): fs.Dirent<string>[] {
    return this.#accessInfo(
      path,
      () => fs.readdirSync(path, { withFileTypes: true }), 
      options, 
      msg
    ) as fs.Dirent<string>[];
  }

  /**
   * @internal
   * Read the file.
   * @param options Lock options.
   * 
   */
  #readFileSync(path: string, options: AllOptions, msg: string = "Couldn't read the `lock file`."): string {
    return this.#accessInfo(
      path,
      () => fs.readFileSync(path, 'utf8'), 
      options, 
      msg
    ) as string;
  }

  /**
   * @internal
   * Final unlock processing.
   * @param options Lock options.
   */
  #releaseActually(options: AllOptions, throwErr = true) {
    this._acquired = false;

    try {
      // Stop the heartbeat (must be stopped before deletion)
      this.#stopHeartbeat()
      // removes `lock file`, etc.
      this.#removeLockFile(options);
    }
    catch (err) {
      if (throwErr) throw err;
    }

    options._ownerId = null;

    this._logger.trace(`Released the lock(key: ${this._key}) at ${DateFormatter.format(new Date())}`);
  }

  /**
   * @internal
   *  
   * @param options Lock options.
   */
  #removeFile(options: AllOptions): void {
    this.#rmSync(options._filePath, options, { force: true }, 'double', "Failed to remove the `lock file`");
    this.#rmDirSync(options._sharerDir, options);
  }

  /**
   * @internal
   * Remove the `lock file`.<br>
   *  - Modified during the process or corrupted ⇒ Do not delete<br>
   *  - Unable to read meta-information ⇒ Do not delete<br>
   *  - Unable to read due to an I/O error (during existence check, unlink, or read) ⇒ Do not delete<br>
   *  - Report the above errors properly—specifically, that the `lock file` could not be deleted due to the error!!<br>
   *
   * In other words: delete only if the `lock file` exists, the metadata can be read, and the owner information matches expectations.
   * 
   * @param options Lock options.
   * @param errMsg 
   */
  #removeLockFile(options: AllOptions): void {
    // Verify that metadata can be successfully retrieved (throw an exception if retrieval fails).
    this.#getInfo(options, true);
    // Remove them, bacause it is my own file.
    this.#removeFile(options);
  }

  /**
   * @internal
   * Remove `lock sharer`s.
   * @param options Lock options.
   * @param msg     Message displayed upon an addition error.
   */
  async #removeSharers(options: AllOptions, sharers?: string[], msg: string = "Failed to remove `lock sharer`s."): Promise<void> {
    sharers = sharers ?? this.#listSharer(options, "Failed to get the list of `lock sharer`s.");
    if (sharers.length === 0) return;
    try {
      return await this.#share(() => {
        sharers.forEach(path => this._unlinkSync(path, options));
      }, options/*, false*/);
    }
    catch (err) {
      const props = { key: this._key, causes: [err] } as Record<string, unknown>;
      sharers.length === 1 && (props.sharerId = sharers[0]);
      throw new FileLockError(msg, { code: 'EIO', props });
    }
  }

  /**
   * @internal
   * Remove a sharer.
   * @param options Lock options.
   * @param msg     Error message. 
   */
  async #removeSharer(options: AllOptions, msg: string = "Failed to remove the lock request from the `lock sharer`."): Promise<void> {
    return this.#removeSharers(options, [path.join(options._sharerDir, options._sharerId)], msg);
  }

  /**
   * @internal
   * Rename file.
   * @param options Lock options.
   */
  private _renameSync(oldPath: string, newPath: string, options: AllOptions, msg: string): void {
    this.#accessInfo(
      oldPath,
      () => fs.renameSync(oldPath, newPath),
      options,
      msg
    );
  }

  /**
   * 
   * @param path 
   * @param options Lock options.
   * @param msg 
   * @returns 
   */
  #rmDirSync(path: string, options: AllOptions, msg: string = "Couldn't remove the directory.") {
    return this.#accessInfo(
      path,
      () => fs.rmSync(path, { force: true, recursive: true }), 
      options, 
      msg
    );
  }

  /**
   * @internal
   * Remove file.
   * @param path 
   * @param options 
   * @param fsOpts 
   * @param retryMode 
   * @param msg 
   */
  #rmSync(path: string, options: AllOptions, fsOpts: object = {}, retryMode: 'normal' | /*'no-retry' |*/ 'double' = 'normal', msg = `Couldn't remove the file or directory.`): void {
    this.#accessInfo(
      path,
      () => fs.rmSync(path, fsOpts),
      options,
      msg,
      retryMode
    );
  }

  /**
   * @interenal
   * Share the lock. <br>
   * It is intended to be called when the lock is acquired by the owner and when the lock is re-acquired.
   * @param operation Sharer operation callback function.
   * @param options   Lock options.
   * @param withLock  To lock or not to lock.
   */
  async #share(operation: () => void, options: AllOptions/*, withLock: boolean = true*/): Promise<void> {
    const lockPath = path.join(options._sharerDir, '.lock');

    // Lock share directory.
    const interval = options._sharerLockIntervalMs;
    const timeout = Date.now() + options._sharerLocktimeoutMs;
    let lastErr;
    do {
      try {
        this.#openSyncExclusively(lockPath, options);
        break;
      }
      catch (err) {
        lastErr = err;
        if (Date.now() >= timeout) break;
        await sleepAsync(interval);
      }
      // ignore the eslint warning about the infinite loop, as it is controlled by the timeout condition.
      // eslint-disable-next-line no-constant-condition
    } while (true);

    if (lastErr instanceof Error) throw Object.assign(lastErr, { path: lockPath });
    
    // Exec operation
    try {
      operation();
    }
    finally {
     this.#rmSync(lockPath, options, { force: true });
    }
  }

  /**
   * @internal
   * Start heartbeat.
   * @param options Lock options.
   */
  #startHeartbeat(options: AllOptions): void {
    REQUIRE_DEBUG(this._heartbeatTimer == null, 
      'Heartbeat multiple startup error. Possible bug.', 
      FileLockError, { code: 'EFILELOCK', props: { options } });

    this._logger.trace(`Start heartbeat(key: ${this._key}, ownerId: ${this._ownerId}) at ${DateFormatter.format(new Date())}`);

    this._heartbeatTimer = setInterval(
      () => {
        try {
          const shouldContinue = () => this._acquired && this._isAlreadyCancelled(options) === false;
          // Avoid `if` statements to ensure code coverage.
          // v8 ignore next 2  -- @preserve
          if (shouldContinue() === false) {
            this.#stopHeartbeat();
          }
          else {
            this.#updateHeartbeat(options);
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
      },
      options.heartbeatIntervalMs
    );
  }

  /**
   * @internal
   * Get the information about the given file path. 
   * @param path    File path.
   * @param options Lock options.
   * @param msg     Error message.
   * @returns The information about the file, or undefined if 'ENOENT'.
   */
  #statSync(path: string, options: AllOptions, msg = "Couldn't get status of the file."): fs.Stats | undefined {
    return this.#accessInfo(path, () => fs.statSync(path, { throwIfNoEntry: false }), options, msg) as fs.Stats;
  }

  /**
   * @internal
   * Stop heartbeat.
   */
  #stopHeartbeat(): void {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
      this._logger.trace(`Stop heartbeat(key: ${this._key}, ownerId: ${this._ownerId}) at ${DateFormatter.format(new Date())}`);
    }
  }

  /**
   * Attempt to acquire the lock; that is, create the `lock file`.
   * @param options Lock options
   * @returns `true` if acquired lock. 
   */
  async #tryLock(options: AllOptions): Promise<{ locked: boolean, reason: string, cause?: unknown }> {
    if (this._acquired) return {locked: false, reason: 'EALREADYLOCKED'};

    const al = this.#assertLock(options);
    // Check lockable, and if lockable, create lock key directry
    if (al.ticket === undefined) {
        return { locked: false, reason: al.reason, cause: al.cause };
    }

    // Create the `lock file`. 
    let lastErr;
    try {
      this.#createLockFile(options, al.ticket);
      await this.#addOwnerAs1stSharer(options);
    }
    catch (err) {
      lastErr = err;
      try {
        // An empty `lock file` should already have been created, so delete it.
        this.#removeFile(options);
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

    this._acquired = true;

    return { locked: true, reason: 'ACQUIRED' };
  }

  /**
   * @internal
   * Remove the file.
   * @param options Lock options.
   */
  private _unlinkSync(path: string, options: AllOptions, retryMode: 'normal' | /*'no-retry' |*/ 'double' = 'normal', msg = `Couldn't remove the file.`): void {
    this.#accessInfo(
      path,
      () => fs.unlinkSync(path),
      options,
      msg,
      retryMode
    );
  }

  /**
   * @internal
   * Update heartbeat.
   */
  #updateHeartbeat(options: AllOptions): void {
    // v8 ignore else -- @preserve
    if (this._heartbeatTimer && this.#heatbeatUpdating === false) {
      this.#heatbeatUpdating = true;
      try {
        const meta = this.#getInfo(options); // IOエラーはあきらめる、浸食エラーもあきらめる（エラーを伝える）
        meta.lastHeartbeatAt = Date.now();
        //try {
          this.#updateInfo(meta, options); // tmp 発見は、リトライ対象であり、getInfoからやり直し。。。
          // ★★#assertLockのtmp生成失敗ロジックを確認せよ！これを、#updateInfoにしこむ？　ではなくて、、、
          // というよりは、、「アップデート権獲得」（これ、ロック取得時といっしょやね、、共通関数だろうねぇ、、
          // 、、現状の排他ロックファイルオープンみたな名前（_openLockFileExclusively）ではなく、共通的な名前にしましょう！！！
          // を宣言する関数を作ろう！　そして、ハートビート更新間隔までは、リトライしてもいいじゃないかな？　被ったら、、、更新しないようにしたし！！！！こんだらどうかな？？
        //}
        //catch (err) { /// ★★★、、、、こんなんでいいの？？　あとから主張するロックしたいやからに、割り込まれて、、、１リトライであきらめるなんて、、、せめて、、ここでも、IOリトライだけではなく、、ちゃんとリトライすべきでないの？？
          // しかも、、ロックリトライよりも、短時間のリトライってどうよ、、、倍速でも良いくらいだよ、、そして、ハートビート間隔の４分の１～半分くらいは使ってもよいかもよ。。。。。
          // じゃぁ、、、IO noretry　で、　本チャンリトライを、、、75ms毎に、、500msec（鼓動の半分程度）までとか、、（つまり、６～７回繰り返すか、、、、？）それとも、このハートビート更新はあきらめるか？　あきらめても、、次のハートビート更新があるじゃん？
          /*const code = err instanceof Error && 'code' in err ? err.code : 'EFILELOCK';
          if (code === 'EEXIST') { // The presence of a .tmp file indicates that the system has been compromised.
            // いやぁ、、、tmp存在だけで、浸食判定はだめだよね。。。だって、仮ロック中の可能性がものすごく大きいからね。。
            throw new LockCompromised("Failed to update `heartbeet`.", { key: this._key, props: { causes: [err] } });
          }
          else {*/
          //  throw err;
          //}
        //}
        this._logger.trace(`Update heartbeat(key: ${this._key}, ownerId: ${this._ownerId}) at ${DateFormatter.format(new Date(meta.lastHeartbeatAt))}`);
      }
      finally {
        this.#heatbeatUpdating = false;
      }
    }
  }

  /**
   * @internal
   * Update the lock information.
   * @param meta    Lock information.
   * @param options Lock options.
   */
  #updateInfo(meta: FileLockMeta, options: AllOptions, ticket?: Ticket): void {
    // For debug
    if (this._isDebug()) {
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

    // Open the .tmp file (if it hasn't been created yet).
    //const tmpPath = options._filePath + '.tmp';
    if (ticket === undefined) {
      //this.#openSyncExclusively(tmpPath, options, "Failed to create the temporary `lock file`."/*, true*/)
      ticket = Ticket.get(this, options);
    }

    try {
      VERIFY(() => Boolean(ticket?.verify()), 
        "The temporary `lock file` must exist, but it's not found.",
        FileLockError, { code: 'ENOENT', props: { key: this._key } }
      );
      ticket?.confirm(meta);
      /*
      // Write to a temporary file first.
      this._writeFileSync(tmpPath, meta, options, "Failed to write the temporary `lock file`.");
      // Replace the target file path with the temporary file (if the file already exists, it is overwritten atomically).
      this._renameSync(tmpPath, options._filePath, options, "Failed to rename the temporary `lock file`.");
      */
    }
    catch (err) {
      try {
        ticket?.release();
        /*
        this._existsSync(tmpPath, options) && 
        this._unlinkSync(tmpPath, options, 'double', "Failed to remove the temporary `lock file`.");
        */
      }
      catch (err2) {
        // Preserve the original cleanup failure; the caller will wrap it as a generic I/O lock acquisition error.
        this._logger.trace("Failed to remove the temporary file for the `lock file`.", err2);
        let causes: unknown[];
        err2 instanceof FileLockError && 
          (causes = ('causes' in err2 ? err2.causes : []) as unknown[]).unshift(err) &&
          Object.assign(err2, { causes });
        throw err2;
      }
      throw err;
    }

    if (FileLock.#config.history === true || this._isDebug() === true) {
      this.#addHistory(meta, options);
    }
  }

  /**
   * @internal
   * Write the file.
   * @param options Lock options.
   */
  private _writeFileSync(path: string, data: unknown, options: AllOptions, msg: string = "Couldn't write the `lock file`."): void {
    const str = JSON.stringify(data, null , "  ");
    this.#accessInfo(
      path,
      () => {
        fs.writeFileSync(path, str, 'utf8');
      },
      options,
      msg
    );
  }

}

// Initialize
FileLock._initialize();

