import { type LockBaseOptions } from './LockBaseOptions.ts';

/**
 * User options for FileLock (inherits from LockBaseOptions)
 */
export interface FileLockOptions extends LockBaseOptions {
  /**
   * Polling interval (checking if locked) in seconds until timeout.  <br>
   * Internally converted to `pollIntervalMs`. Cannot be used with `pollIntervalMs`. 
   * The default and minimum values ​​are the same as those for `pollIntervalMs`.
   */
  pollIntervalSec?: number;

  /**
   * Polling interval (checking if locked) in milliseconds until timeout.  <br>
   * Cannot be used with `pollIntervalSec`. <br>
   * Minimum is `100`; if a value lower than this is specified, this minimum value is used.
   * Default is `100`.
   */
  pollIntervalMs?: number;

  /**
   * Heartbeat interval in seconds while the locked process is running.  <br>
   * The `lock file` is updated at this interval until the process completes. Internally converted to `heartbeatIntervalMs`. 
   * Cannot be used with `heartbeatIntervalMs`. <br>
   * The default and minimum values ​​are the same as those for `heartbeatIntervalMs`. 
   */
  heartbeatIntervalSec?: number;

  /**
   * Heartbeat interval in milliseconds while the locked process is running.  <br>
   * The `lock file` is updated at this interval until the process completes. Cannot be used with `heartbeatIntervalSec`.<br>
   * Minimum is `1000`; if a value lower than this is specified, this minimum value is used.
   * Default is `1000`.
   */
  heartbeatIntervalMs?: number;

  /**
   * Validity period in seconds for the last heartbeat update.  <br>
   * If this amount of time has not elapsed since the last update, the process is considered to be still running (heartbeat valid). 
   * Internally converted to `heartbeatTtlMs`. Cannot be used with `heartbeatTtlMs`. 
   * The default and minimum values ​​are the same as those for `heartbeatTtlMs`.
   */
  heartbeatTtlSec?: number;

  /**
   * Validity period in milliseconds for the last heartbeat update.  <br>
   * If this amount of time has not elapsed since the last update, the process is considered to be still running. This cannot be used in conjunction with `heartbeatTtlSec`.
   * Minimum is `5000`; if a value lower than this is specified, this minimum value is used.
   * Default is `5000`.
   */
  heartbeatTtlMs?: number;

  /**
   * Retry interval (in seconds) for failed heartbeat updates.  <br>
   * Internally converted to `heartbeatRetryIntervalMs`. Cannot be used with `heartbeatRetryIntervalMs`. 
   * The default and minimum values ​​are the same as those for `heartbeatRetryIntervalMs`.
   */
  heartbeatRetryIntervalSec?: number;

  /**
   * Retry interval (in milliseconds) for failed heartbeat updates.  <br>
   * If a lock file update fails for reasons other than a fatal error (such as an I/O error or a "compromised" error), 
   * the operation will be retried after a specified interval. 
   * The number of retries is determined internally, based on the `heartbeatIntervalMs` and the `heartbeatTtlMs`.
   * Cannot be used with `heartbeatRetryIntervalSec`.<br>
   * Minimum is `100`; if a value lower than this is specified, this minimum value is used.
   * Default is `100`.
   */
  heartbeatRetryIntervalMs?: number;

  /**
   * Number of retries for `lock file` operations in the event of an I/O error. <br>
   * Minimum is `0`; if a value lower than this is specified, this minimum value is used.
   * Default is `1`.
   */
  retriesOnIoErr?: number;

  /**
   * Interval in seconds between `lock file` operation retries.  <br>
   * Internally converted to `retryIntervalMs`. Cannot be used together with `retryIntervalMs`. 
   * The default and minimum values ​​are the same as those for `retryIntervalMs`.
   */
  retryIoIntervalSec?: number;

  /**
   * Interval in milliseconds between `lock file` operation retries.  <br>
   * Cannot be used together with `retryIntervalSec`. 
   * Minimum is `100`; if a value lower than this is specified, this minimum value is used.
   * Default is `100`.
   */
  retryIoIntervalMs?: number;

  /**
   * Validity period in seconds for the modification time of invalid `lock file`s and related items. <br>
   * If the specified amount of time has elapsed since the modification time of an invalid `lock file` or related item, it is deemed invalid and forcibly deleted. 
   * Internally converted to `invalidTtlMs`. Cannot be used with `invalidTtlMs`. 
   * The default and minimum values ​​are the same as those for `invalidTtlMs`.
   */
  invalidTtlSec?: number,

  /**
   * Validity period in milliseconds for the modification time of invalid `lock file`s and related items. <br>
   * If the specified amount of time has elapsed since the modification time of an invalid `lock file` or related item, it is forcibly deleted. 
   * If not specified, forced deletion of invalid files will not be performed. 
   * Cannot be used together with `invalidTtlSec`. 
   * Minimum is `heartbeatTtlMs`; if a value lower than this is specified, this minimum value is used.
   * Default is unspecified.
   */
  invalidTtlMs?: number,
}

