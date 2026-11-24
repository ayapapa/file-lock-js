import { type FileLockOptions } from './FileLockOptions.ts';
import { defaultFileLockConfig, /*defaultFileLockOptions, */FileLockImpl, /*minimumFileLockOptions, */type CallbackOnLock, /*type FileLockRequiredOptions*/ } from './FileLockImpl.ts';
import { type FileLockConfig } from './FileLockConfig.ts';

/**
 * Interface of FileLock.
 */
export interface FileLockClass {
  /** Get current configurations. */
  getConfig(): Readonly<FileLockConfig>;
  /** Get default configurations. */
  get defaultConfig(): FileLockConfig;
  /** Get default options. */
  get defaultOptions(): FileLockOptions;
  /**Get the history informations. */
  get historyInfo(): Readonly<{
    historyEnabled: boolean, 
    historyId: string, 
    historyPath: string, 
    processId: number 
  }>;
  /** Get `lock directory` */
  get lockDir(): string;
  /** 
   * get number of queues.
   * The initial value matches `maxConcurrency`. 
   * If any `extra queue`s are created, their count is also included.
   */
  get numberOfQueues(): number;
  /** Resets the current settings to their default values. */
  resetConfig(): void;
  /** Set configurations. Overwrite part of the current settings.
   * At the same time, the cache is cleared.
   */
  setConfig(config: FileLockConfig): void;
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
   * @throws {@link InvalidOptions} Invalid options.
   * @throws {@link AlreadyLocked}  Failed to acquire the lock within the specified time. See {@link FileLockOptions}'s `timeoutMs`.
   * @throws {@link TTLExceeded}  Failed to release the lock within the specified time. See {@link FileLockOptions}'s`ttlMs`.
   * @throws {@link DeadlockDetected} A deadlock has been detected. See {@link FileLockOptions}'s `allowReentry`.
   * @throws {@link LockDirectoryCreationFailed} Failed to create the `lock directory`.
   * @throws {@link LockCompromised} The lock was compromised during the locking process.
   */
  withLock<T>(key: string, onLockFn: CallbackOnLock<T>, options?: FileLockOptions): Promise<T>;
};

/**
* A global file-lock object. 
* As long as this object is used, it will be shared across any instances, provided they belong to the same process.
 */
export const FileLock = createFileLock();

/**
 * Creates a file lock object. 
 * Objects created by this function do not share their settings with other objects.  
 * @param config 
 * @returns Implementation class of FileLockClass.
 */
export function createFileLock(config: FileLockConfig = defaultFileLockConfig): FileLockClass {

  /**
  * File-based lock class. 
  * Acquires a lock by creating a file derived from the specified key, executes the provided callback, and then releases the lock (by deleting the created file). 
  * While the file exists, no other lock can be acquired for the same key. 
  * Settings such as `timeoutMs` allow for waiting until an unreleased lock is freed. 
  */
  class FileLock {
    /** 
     * Static methods
     */

    /** Get current configurations. */
    public static getConfig(): Readonly<FileLockConfig> {
      return FileLockImpl.getConfig();
    }

    /** Get default configurations. */
    public static get defaultConfig(): Readonly<FileLockConfig> {
      return FileLockImpl.defaultConfig;
    }

    /**
     * Get default options.
     * @returns Default options.
     */
    public static get defaultOptions(): Readonly<FileLockOptions> {
      return FileLockImpl.defaultOptions;
    }

    /**
     * Get the history informations.
     * @returns Returns the history permission flag, history identifier, history file path, and process identification.
     */
    public static get historyInfo(): Readonly<{
      historyEnabled: boolean, 
      historyId: string, 
      historyPath: string, 
      processId: number 
    }> {
      return FileLockImpl.historyInfo;
    }

    /** Get `lock directory` */
    public static get lockDir() { return FileLockImpl.lockDir; }

    /** 
     * get number of queues.
     * The initial value matches `maxConcurrency`. 
     * If any `extra queue`s are created, their count is also included.
     */
    public static get numberOfQueues() { return FileLockImpl.numberOfQueues; }

    /** Resets the current settings to their default values. */
    public static resetConfig(): void {
      FileLockImpl.resetConfig();
    }

    /**
     * Set configurations.<br>
     * Overwrite part of the current settings. 
     * At the same time, the cache is cleared.
     * @param config  Lock configurations. 
     */
    public static setConfig(config: FileLockConfig): void {
      FileLockImpl.setConfig(config);
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
     * @throws {@link InvalidOptions} Invalid options.
     * @throws {@link AlreadyLocked}  Failed to acquire the lock within the specified time. See {@link FileLockOptions}'s `timeoutMs`.
     * @throws {@link TTLExceeded}  Failed to release the lock within the specified time. See {@link FileLockOptions}'s`ttlMs`.
     * @throws {@link DeadlockDetected} A deadlock has been detected. See {@link FileLockOptions}'s `allowReentry`.
     * @throws {@link LockDirectoryCreationFailed} Failed to create the `lock directory`.
     * @throws {@link LockCompromised} The lock was compromised during the locking process.
     */
    public static async withLock<T>(key: string, onLockFn: CallbackOnLock<T>, options: FileLockOptions  = {}): Promise<T> {
      return FileLockImpl.withLock(key, onLockFn, options);
    }
  }

  FileLock.setConfig(config);

  return FileLock;
}

export { defaultFileLockConfig };