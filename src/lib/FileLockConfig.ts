import { type FileLockOptions } from './FileLockOptions.ts';
import { type LockBaseConfig } from './LockBaseConfig.ts'

/**
 * FileLock cofiguration. 
 */
export interface FileLockConfig extends LockBaseConfig {
  /**
   * Specifies the directory path to stored locking imformations.
   * Default is `${process.cwd()}/.lock` ('.lock' under the current working directory at runtime.)
   */
  lockDirectory?: string;

  /** 
   * Whether to enable caching for FileLock instances associated with a key.
   * Default is `true`.
   */
  cache?: boolean;

  /**
   * Maximum number of cache entries. 
   * Valid only when `cache` is `true`.
   * Minimum is `1`; if a value lower than this is specified, this minimum value is used.
   * Default is `100`.
   */
  maxCacheEntries?: number;

  /**
   * Cache expiration time (milliseconds). 
   * Valid only when `cache` is `true`.
   * Default and minimum `10000`.
   */
  cacheTtlMs?: number;

  /**
   * Global default options.
   * These are used as the default values ​​for options specified in `withLock()`.
   * Default is the return value of `FileLock.getDefaultOptions()`. 
   */
  defaultOptions?: FileLockOptions;

  /**
   * @internal
   * Whether to keep a history of lock information. 
   * This is for debugging.
   * If `true`, a history of lock information will be appended into a file named `xxxx.json` in the `lock directory`/history/.
   * Default is `false`.
   */
  history?: boolean;

  /**
   * @internal
   * Maximum number of history entries to keep. 
   * This is for debugging.
   * If the number of entries exceeds this value, the oldest entries will be deleted in order.
   * Minimum is `1`; if a value lower than this is specified, this minimum value is used.
   * Default is `100`.
   */
  maxHistoryEntries?: number;

  /**
   * @internal
   * Maximum number of history files to keep. 
   * This is for debugging.
   * If the number of entries exceeds this value, the oldest entries will be deleted in order.
   * Minimum is `1`; if a value lower than this is specified, this minimum value is used.
   * Default is `100`.
   */
  maxHistoryFiles?: number;
}

