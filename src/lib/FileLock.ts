import { REQUIRE } from './Contracts.ts';
import { type FileLockOptions } from './FileLockOptions.ts';
import { FileLockInternal, minimumFileLockOptions, type CallbackOnLock, type FileLockRequiredOptions } from './FileLockInternal.ts';
import { FileLockOptionsResolver } from "./FileLockOptionsResolver.ts";
import { type FileLockConfig } from './FileLockConfig.ts';
import { InvalidOptions } from './LockBaseErrors.ts';

/**
* File-based lock class. 
* Acquires a lock by creating a file derived from the specified key, executes the provided callback, and then releases the lock (by deleting the created file). 
* While the file exists, no other lock can be acquired for the same key. 
* Settings such as `timeoutMs` allow for waiting until an unreleased lock is freed. 
*/
export class FileLock {
  /** 
   * Static methods
   */

  /** Get current configurations. */
  public static getConfig(): FileLockConfig {
    return FileLockInternal.getConfig();
  }

  /** Get default configurations. */
  public static get defaultConfig(): FileLockConfig {
    return FileLockInternal.defaultConfig;
  }

  /**
   * Get default options.
   * @returns Default options.
   */
  public static get defaultOptions(): FileLockOptions {
    return FileLockInternal.defaultOptions;
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
    return FileLockInternal.historyInfo;
  }

  /** Get `lock directory` */
  public static get lockDir() { return FileLockInternal.lockDir; }

  /** Resets the current settings to their default values. */
  public static resetConfig(): void {
    FileLockInternal.resetConfig();
  }

  /**
   * Set configurations.<br>
   * Overwrite part of the current settings. 
   * At the same time, the cache is cleared.
   * @param config  Lock configurations. 
   */
  public static setConfig(config: FileLockConfig): void {
    FileLockInternal.setConfig(config);
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
  public static async withLock<T>(key: string, onLockFn: CallbackOnLock<T>, options: FileLockOptions  = {}): Promise<T> {
    REQUIRE(typeof key === 'string' && key !== '', '`key` must be specified as a non-empty string.', InvalidOptions, { name: 'key' });
    // If defaultOptions is specified in the config, it will be used as the default options.
    const defaultOpts = { ...FileLockInternal.defaultOptions, ...FileLockInternal.getConfig().defaultOptions } as FileLockRequiredOptions;
    // Resolve options.
    const rOpt = new FileLockOptionsResolver(options, minimumFileLockOptions, defaultOpts).getRequiredOptions();
    return FileLockInternal._getLock(key)._withLock(onLockFn, rOpt);
  }
}
