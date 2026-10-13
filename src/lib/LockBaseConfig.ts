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
   * @internal
   * Indicates whether to execute in debug mode. <br>
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

/**
 * @internal
 * Default values of LockBaseConfig.
 */
 export const defaultLockBaseConfig: Readonly<Required<LockBaseConfig>> = {
  logger: console,
  _debug: false,
}