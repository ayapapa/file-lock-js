import { REQUIRE } from "./Contracts.ts";
import { sleepAsync } from "./Util.ts";

/**
 * @internal
 * `RetryDelay` options.
 */
export interface DelayOptions {
  /** */
  base: number; 
  /** */
  max?: number; 
  /** */
  factor?: number; 
  /** */
  jitterRatio?: number;
}
/**
 * @internal
 * @abstract
 * A class that calculates the jittered `retry` interval, that is jittered delay.
 */
export class RetryDelay {
  protected _attempt: number = 0;
  protected readonly _base: number;
  protected readonly _max: number;
  protected readonly _factor: number;
  protected readonly _jitterRatio: number;

  protected constructor(options: DelayOptions) {
    this._base    = options.base;
    this._max     = options.max ?? Infinity;
    this._factor  = options.factor ?? 1;
    this._jitterRatio  = options.jitterRatio ?? 0;
  }

  /** Obtain the next jittered delay. */
  public next() : number {
    const raw = this.nextRaw();
    this._attempt++;
    const capped = Math.min(raw, this._max);
    const jitter = (1 - this._jitterRatio) + Math.random() * this._jitterRatio * 2;
    return Math.round(jitter * capped);
  }

  /** 
   * @abstract
   * The next raw (pre-jittered) delay.
   */
  protected nextRaw() { return this._base; }
}

/**
 * @internal
 * A class that calculates a jittered delay 
 * which increases linearly each time `next()` is called.
 * Each time `next()` is called, a value is calculated by 
 * taking the result of `base * factor * call_count` (where `call_count` starts at 1) 
 * and adding some jitter (random variation) to it.
 */
/*
export class LinearDelay extends RetryDelay {
  public constructor(options: DelayOptions) {
    options.factor = options.factor ?? 1;
    super(options);
  }
  protected override nextRaw() { return this._base * this._factor * (this._attempt + 1); }
}
*/
/**
 * @internal
 * A class that calculates a jittered delay 
 * which increases exponentially each time `next()` is called.
 * Each time `next()` is called, a value is calculated by 
 * taking the result of `base * factor ** call_count` (where `call_count` starts at 0) 
 * and adding some jitter (random variation) to it.
 */
export class ExponentialDelay extends RetryDelay {
  public constructor(options: DelayOptions) {
    options.factor = options.factor ?? 2;
    options.factor = Math.max(1, options.factor);
    super(options);
  }
  protected override nextRaw() { return this._base * this._factor ** this._attempt; }
}

/**
 * @internal
 * A class that calculates a jittered delay—based on a fixed value each time `next()` is called.
 * Each time `next()` is called, a value is calculated by 
 * taking the result of `base * factor and adding some jitter (random variation) to it.
 */
export class FixedDelay extends RetryDelay {
  public constructor(options: DelayOptions) {
    options.factor = options.factor ?? 1;
    super(options);
  }
  protected override nextRaw() { return this._base * this._factor; }
}

/**
 * @internal
 * A function that performs retries based on the specified delay calculation class and options.
 * @param fn        A function targeted for retries. 
 * @param shouldRetry  A function that determines whether or not to retry, based on the result of the function `fn`.
 * @param timeoutAndOrRetries Specify either `timeout` or `retries` (or both). If neither is specified, an error will occur.
 * @param DelayCls  Delay calculation class name. It is either `FixedDelay`, `LinearDelay`, or `ExponentialDelay`.
 * @param options   Options passed to Delay calculation class.
 */
export async function retry<T> (
  fn: () => T | PromiseLike<T>, 
  shouldRetry: (result: T) => boolean,
  timeoutAndOrRetries: { timeout?: number, retries?: number },
  DelayCls: new (options: DelayOptions) => RetryDelay, 
  options: DelayOptions
) {
  REQUIRE(timeoutAndOrRetries.timeout != null || timeoutAndOrRetries.retries != null, 'Neither `timeout` nor `retries` is specified in `timeoutAndOrRetries`.', TypeError);
  REQUIRE(Object.getPrototypeOf(DelayCls) === RetryDelay, '`DelayCls` is not a class that extends from `RetryDelay`.', TypeError);
  const timeout = timeoutAndOrRetries.timeout ?? Infinity;
  const retries = timeoutAndOrRetries.retries ?? Infinity;
  const delay = new DelayCls(options);

  let result;
  let attempt = 0;
  while (shouldRetry((result = await fn())) && Date.now() < timeout && attempt < retries) {
    await sleepAsync(delay.next());
    attempt++;
  }
  return result;
}