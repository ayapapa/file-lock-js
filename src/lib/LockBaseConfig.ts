import { QueueManager } from './QueueManager.ts';

/** Type of the log output object. */
export type LogProvider = Pick<Console, 'log' | 'trace' | 'debug' | 'info' | 'warn' | 'error' > & {fatal?: (...args: any[]) => void};

/** Basic config */
export interface LockBaseConfig {

  /**
   * External logger. 
   * Default is `console`.
   * 
   */
  logger?: LogProvider;

  /**
   * Queue manager.
   * Specifying a `QueueManager` instance enables a lock request queuing system that operates according to the configured settings.
   * If `undefined`, disable a lock request queuing system.
   * Default is `QueueManager`({ maxConcurrency: 5, maxPending: 500 }).
   */
  queueManager?: QueueManager<string> | undefined;
  /**
   * Whether or not to use a lock request queue.
   * Default is true.
   */
  //queue?: boolean;

  /**
   * The max number of lock requests allowed at a time.
   * Valid only when `queue` is `true`.
   * Default is 500.　Min is 1.
   */
  //maxPending?: number;

  /**
   * The number of lock requests that can be processed concurrently.
   * Valid only when `queue` is `true`. Therefore, this corresponds to the number of queues.
   * Default is 5. Min is 1. 
   */
  //maxConcurrency?: number;

  /**
   * @internal
   * Whether to execute in debug mode. <br>
   * If `true`:
   * - Process-related information is added to the lock information file.
   * - History tracking is enabled.
   * - If no logger is specified, or if `console` is specified as the logger, `trace` and `debug` logs from this library are output.   
   * This is a debug flag for this class and is intended for use only during development.
   * However, if an external logger is injected, it cannot be controlled; 
   * please adjust the log level yourself as necessary.
   * Default is `false`.
   */
  _debug?: boolean;
}
