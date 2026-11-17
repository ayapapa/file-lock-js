import { LockBaseOptionsResolver } from './LockBaseOptionsResolver.ts';
import { type FileLockRequiredNumericOptions, type FileLockRequiredOptions } from './FileLockInternal.ts';
import { type FileLockOptions } from './FileLockOptions.ts';
import { type KeyTypeMap, type TimeBasedKey } from './Util.ts';
//import { VERIFY_DEBUG } from './Contracts.ts';
//import { InvalidOptions } from './LockBaseErrors.ts';

/**
 * @internal
 * A class that resolves Options for FileLock.
 */
export class FileLockOptionsResolver extends LockBaseOptionsResolver<FileLockOptions, FileLockRequiredNumericOptions, FileLockRequiredOptions> {
  
  /** Options that include all properties */
  static #allOptions: Required<FileLockOptions> = {
    ...super._allBaseOptions,
    pollIntervalMs: 0, pollIntervalSec: 0, heartbeatIntervalMs: 0, heartbeatIntervalSec: 0, heartbeatRetryIntervalMs: 0, heartbeatRetryIntervalSec: 0,
    heartbeatTtlMs: 0, heartbeatTtlSec: 0, retriesOnIoErr: 0, retryIoIntervalMs: 0, retryIoIntervalSec: 0, invalidTtlMs: 0, invalidTtlSec: 0,
  }

  /**
   * Constructor.
   * @param options User options.
   */
  constructor(options: FileLockOptions, minimumOptions: FileLockRequiredNumericOptions, defaultOptions: FileLockRequiredOptions ) {
    super(options, minimumOptions, defaultOptions);
  };

  /** Get options that include all properties */
  protected override get _allOptions(): Required<FileLockOptions> {
    return FileLockOptionsResolver.#allOptions;
  }

  /** Get the type-checking pairs `{'property name': 'value type'}` for the optional properties. */
  protected override _getCheckTypePairs(): KeyTypeMap<FileLockOptions> {
    const basics = super._getCheckTypePairs();
    return {
      ...basics,
      pollIntervalSec:            "number",
      pollIntervalMs:             "number",
      heartbeatIntervalSec:       "number",
      heartbeatIntervalMs:        "number",
      heartbeatTtlSec:            "number",
      heartbeatTtlMs:             "number",
      retriesOnIoErr:             "number",
      retryIoIntervalSec:         "number",
      retryIoIntervalMs:          "number",
      heartbeatRetryIntervalSec:  "number",
      heartbeatRetryIntervalMs:   "number",
      invalidTtlSec:              "number",
      invalidTtlMs:               "number",
    };
  }
  
  /** Get an array of time-related base names (keys) from the option properties. */
  protected override _getTimeKeys(): TimeBasedKey<FileLockOptions>[] {
    const bases = super._getTimeKeys();
    bases.push('pollInterval', 'heartbeatInterval', 'heartbeatTtl', 'retryIoInterval', 'heartbeatRetryInterval', 'invalidTtl');
    return bases;
  }

  /**
   * @internal
   * Transform, and complete options.
   * @protected
   */
  protected override _normalizeOptions(options: FileLockOptions): FileLockOptions {
    options = super._normalizeOptions(options);
    if (options.heartbeatTtlMs != null && 'invalidTtlMs' in options) {
      // Since the existence of `heartbeatTtlMs` has already been verified above, 
      // it is used as a confirmed value.
      options.invalidTtlMs = Math.max(options.invalidTtlMs, options.heartbeatTtlMs!);
    }
    return options;
  }
}
