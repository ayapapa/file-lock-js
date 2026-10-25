export interface DelayOptions {base: number; max?: number; factor?: number; jitterRate?: number; }

export class RetryDelay {
  protected _attempt: number = 0;
  protected readonly _base: number;
  protected readonly _max: number;
  protected readonly _factor: number;
  protected readonly _jitterRate: number;
  protected constructor(options: DelayOptions) {
    this._base    = options.base;
    this._max     = options.max ?? Infinity;
    this._factor  = options.factor ?? 1;
    this._jitterRate  = options.jitterRate ?? 0;
  }
  public next() : number {
    const raw = this.nextRaw();
    this._attempt++;
    const capped = Math.min(raw, this._max);
    const jitter = (1 - this._jitterRate) + Math.random() * this._jitterRate * 2;
    return Math.round(jitter * capped);
  }
  protected nextRaw() { return this._base; }
}

export class LinearDelay extends RetryDelay {
  public constructor(options: DelayOptions) {
    options.factor = options.factor ?? 1;
    super(options);
  }
  protected override nextRaw() { return this._base * this._factor * (this._attempt + 1); }
}

export class ExponentialDelay extends RetryDelay {
  public constructor(options: DelayOptions) {
    options.factor = options.factor ?? 2;
    options.factor = Math.max(1, options.factor);
    super(options);
  }
  protected override nextRaw() { return this._base * this._factor ** this._attempt; }
}

export class FixedDelay extends RetryDelay {
  public constructor(options: DelayOptions) {
    options.factor = options.factor ?? 1;
    super(options);
  }
  protected override nextRaw() { return this._base * this._factor; }
}
