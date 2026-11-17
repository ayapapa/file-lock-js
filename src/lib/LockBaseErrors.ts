/** Type of LockeError proerties. */
export type LockErrorProps = Record<string, unknown>;

/** Error codes for LockBase */
export type LockErrorCode = 'ELOCK' | 'EDEADLK' | 'ETTLEXCEEDED' | 'EALREADYLOCKED' | 'EINVAL' | 'ERELEASE' | 'EMAXPENDING';

/**
 * Basic lock handling error. 
 */
export class LockError<C extends string = LockErrorCode> extends Error {
  public code:string = 'ELOCK';
  /**
   * Constructor.
   * @param msg   Error message.
   * @param params  Parameters.
   * - code: string  Error code. 
   * - props: LockErrorProps  Additinal properties. 
   */
  constructor(msg: string, params?: { code?: C, props?: LockErrorProps | null}) {
    super(msg);
    Object.defineProperty(this, 'message', {
      value: msg,
      enumerable: true,
      configurable: true,
      writable: true,
    });
    const props = {...params?.props};
    this.code = (params?.code) ?? 'ELOCK';
    Object.assign(this, props);
  }
};

/**
 * Deadlock detection error. 
 */
export class DeadlockDetected extends LockError {
  /**
   * Constructor.
   * @param msg   Error message.
   * @param params  Parameters.
   * - key: string  `lock key`. 
   * - props: LockErrorProps  Additinal properties. 
   */
  constructor(msg?: string, params?: { key: string, props?: LockErrorProps }) {
    msg = msg || 'A deadlock was detected.';
    const props = {...params?.props};
    params?.key && (props.key = params?.key);
    super(msg, { code: 'EDEADLK' , props });
  }
};

/**
 * TTL exceeded error.
 */
export class TTLExceeded extends LockError {
  /**
   * Constructor.
   * @param msg   Error message.
   * @param params  Parameters.
   * - ttlMs: number  The specified validity period (time to live) in milliseconds of the lock. 
   * - key: string  `lock key`. 
   * - props: LockErrorProps  Additinal properties. 
   */
  constructor(msg?: string, params?: { ttlMs: number, key: string, props?: LockErrorProps }) {
    const ttlMs = params?.ttlMs;
    msg = msg || `The maximum processing time(${ttlMs ?? "options.ttlMs"} milliseconds) while locked has been exceeded.`;
    const props = {...params?.props };
    if (ttlMs != null) props.ttlMs = ttlMs;
    if (params?.key != null) props.key = params.key;
    super(msg, { code: 'ETTLEXCEEDED', props });
  }
};

/** Already locked error. */
export class AlreadyLocked extends LockError {
  /**
   * Constructor.
   * @param msg   Error message.
   * @param params  Parameters.
   * - key: string  `lock key`. 
   * - props: LockErrorProps  Additinal properties. 
   */
  constructor(msg?: string, params?: { key: string, timeoutMs?: number, props?: LockErrorProps } ) {
    const key = params?.key;
    msg = msg || `Failed to acquire the lock because the '${key ?? "key"}' is already locked.`;
    const props = {...params?.props};
    if (key != null) props.key = key;
    super(msg, { code:'EALREADYLOCKED' , props });
  }
};

class InvalidObjectValueType extends LockError {
  /**
   * Constructor.
   * @param msg   Error message.
   * @param params  Parameters.
   * - name: string | string[]  Invalid property's key or keys. 
   * - props: LockErrorProps    Additinal properties. 
   */
  constructor(msg: string | undefined, type : 'options' | 'configuration', params?: { name?: string | string[], props?: LockErrorProps } ) {
    const name: string | string[] | undefined = params?.name;
    msg = msg || `The specified ${type} contains values of invalid types.`;
    const props = {...params?.props};
    if (name) {
      if (typeof name === 'string') 
        props.name = name;
      else
        props.names = name;
    }
    super(msg, { code:'EINVAL' , props });
  }
};

/** Invalid configuration error. */
export class InvalidConfiguration extends InvalidObjectValueType {
  /**
   * Constructor.
   * @param msg   Error message.
   * @param params  Parameters.
   * - name: string | string[]  Invalid property's key or keys. 
   * - props: LockErrorProps    Additinal properties. 
   */
  constructor(msg?: string, params?: { name?: string | string[], props?: LockErrorProps } ) {
    super(msg, 'configuration', params);
  }
};

/** Invalid options error. */
export class InvalidOptions extends InvalidObjectValueType {
  /**
   * Constructor.
   * @param msg   Error message.
   * @param params  Parameters.
   * - name: string | string[]  Invalid property's key or keys. 
   * - props: LockErrorProps    Additinal properties. 
   */
  constructor(msg?: string, params?: { name?: string | string[], props?: LockErrorProps } ) {
    super(msg, 'options', params);
  }
};

/** 
 * Processing was interrupted due to a failure to release the lock or decrement the lock counter. 
 * As this is likely caused by a file I/O error, a system check is recommended. 
 * Additionally, files or directories such as lock files or shared lock information
 * may remain, so they must be manually deleted.
 */
export class ReleaseFailed extends LockError {
  /**
   * Constructor.
   * @param msg   Error message.
   * @param params  Parameters.
   * - key: string  `lock key`. 
   * - props: LockErrorProps  Additinal properties. 
   */
  constructor(msg?: string, params?: { key: string, props?: LockErrorProps }) {
    msg = msg || "Processing is interrupted because the lock release or lock counter decrement failed.";
    const props = { ...params?.props };
    params?.key     && (props.key = params?.key);
    
    super(msg, { code: 'ERELEASE' , props });
  }
};

/**
 * An error that occurs when the maximum number of concurrent lock requests is exceeded.
 */
export class PendingLocksExceeded extends LockError {
  /**
   * Constructor.
   * @param msg   Error message.
   * @param params  Parameters.
   * - maxPending: number  Specified max number of lock requests allowed at a time. 
   * - props: LockErrorProps  Additinal properties. 
   */
  constructor(msg?: string, params?: { maxPending: number, props?: LockErrorProps }) {
    msg = msg || "The number of pending lock requests exceeds the allowable limit.";
    const props = { ...params?.props };
    params && (props.maxPending = params?.maxPending);
    super(msg, { code: 'EMAXPENDING' , props });
  }
};