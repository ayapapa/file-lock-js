import { LockError, AlreadyLocked, DeadlockDetected, InvalidOptions, TTLExceeded, type LockErrorCode, type LockErrorProps } from './LockBaseErrors.ts';

/** Error codes for FileLock */
export type FileLockErrorCode = LockErrorCode | 'EFILELOCK' | 'EINITIALIZING' | 'EIO' | 'EHISTORY' | 'ELOCKDIRSTAT' | 'ELOCKDIRCREATE' | 'ECOMPROMISED';

/**
 * Basic lock handling error. 
 */
export class FileLockError extends LockError<FileLockErrorCode> {
  /**
   * Constructor.
   * @param msg   Error message.
   * @param params  Parameters.
   * - code: `FileLockErrorCode` Error code.
   * - props: `LockErrorProps`  Additional   properties. 
   */
  constructor(msg: string, params?: {code: FileLockErrorCode, props?: LockErrorProps }) {
    const p = { ...params };
    // Avoided using `if` statements to ensure code coverage.
    p.code == null && (p.code = 'EFILELOCK');
    super(msg, p);
  }

  /**
   * @internal
   * @param key     The `lock key` for which the lock acquisition failed.
   * @param causes  The list of causes for the error.
   * @param msg     Error message.
   * @returns `FileLockError` instance.
   */
  public static lockFailedDueToIO( key: string, causes: unknown[], msg = "Failed to acquire the lock due to a file I/O error.") {
    return new FileLockError(msg, { code: 'EIO', props: { key, causes } });
  }

  /**
   * @internal
   * Create a history file analysis error instance.
   * @param history  Path to the history file. 
   * @param causes    The parsing error that caused the issue.
   * @returns An instance of FileLockError.
   */
  public static historyPasingFailed(history: string, causes: unknown[]): FileLockError {
    return new FileLockError("Failed to parse the history file.", { code: 'EHISTORY', props: { history, causes } });
  }

 /**
  * Create a lock acquisition errors caused by history file analysis errors.
   * @param history  Path to the history file. 
   * @param causes    The parsing error that caused the issue.
   * @returns An instance of FileLockError.
  */
  public static lockFailedDueToHistory(history: string, causes: unknown[]): FileLockError {
    return new FileLockError("Failed to acquire the lock due to history parsing failure.", { code: 'EHISTORY', props: { history, causes } });
  }

};

/** 
 * Lock directory access error.
 */
class LockDirectoryAccessFailed extends FileLockError {
  /**
   * Constructor.
   * @param fsErrorMsg   fs's error message.
   * @param operation   Operation on the `lock directory`.
   * @param code  Error code string.
   * @param params  Parameters.
   * - path: `string`  `lock directory` path. 
   * - props: `LockErrorProps`  Additional properties. 
   */
  protected constructor(reason: string | null, operation: string, code: FileLockErrorCode, params?: {path?: string, props?: LockErrorProps }) {
    const path = params?.path;
    const props = { ...params?.props };
    if (path != null) props.path = path;
    if (reason != null) props.reason = reason;
    super(`Failed to ${operation} the ${"`lock directory`"}${path ? '('+path+')' : ""}.`, { code , props });
  }
}

/**
 * Lock directory 'Stat' error.
 */
export class LockDirectoryStatFailed extends LockDirectoryAccessFailed {
  /**
   * Constructor.
   * @param reason  fs’s error messages, etc.
   * @param params    Parameters.
   * - path: `string`  `lock directory` path. 
   * - props: `LockErrorProps`  Additional properties. 
   */
  constructor(reason: string | null, params?: {path?: string, props?: LockErrorProps }) {
    super(reason, 'check the status of', 'ELOCKDIRSTAT', params);
  }
}

/**
 * Lock directory 'Creaate' error.
 */
export class LockDirectoryCreationFailed extends LockDirectoryAccessFailed {
  /**
   * Constructor.
   * @param reason  fs’s error messages, etc.
   * @param params  Parameters.
   * - path: `string`  `lock directory` path. 
   * - props: `LockErrorProps`  Additional properties. 
   */
  constructor(reason: string | null, params?: {path?: string, props?: LockErrorProps }) {
    super(reason, 'create', 'ELOCKDIRCREATE', params);
  }
}

/** 
 * Lock compromised error. 
 */
export class LockCompromised extends FileLockError {
  /**
   * Constructor.
   * @param reason Reason for the error.
   * @param params  Parameters.
   * - key: `string`  `lock key`. 
   * - props: `LockErrorProps`  Additional properties. 
   */
  constructor(reason: string | null, params?: { key: string, props?: LockErrorProps }) {
    const key: string | null = params?.key ?? null;
    const props = { ...params?.props };
    if (params?.key) props.key = key;
    if (reason) props.reason = reason;
    super(
      `The lock was compromised during the locking process.`,
      {code: `ECOMPROMISED`, props }
    );
  }
}

export { AlreadyLocked, DeadlockDetected, InvalidOptions, LockError , TTLExceeded };
