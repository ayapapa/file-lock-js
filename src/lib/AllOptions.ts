import { type LockBaseOptions } from "./LockBaseOptions.ts";
import { type LockBaseInternalState } from "./LockBaseInternalState.ts";

/**
 * A fusion of user options and internal options.
 */
export type AllOptions<
  U extends LockBaseOptions = LockBaseOptions,
  I extends LockBaseInternalState = LockBaseInternalState
> = U & I;

/** 
 * Keys of AllOptions 
 */
export type AllOptionsKey<
  U extends LockBaseOptions = LockBaseOptions,
  I extends LockBaseInternalState = LockBaseInternalState
> = keyof AllOptions<U, I>;

/**
 * Options for testing.
 */
export interface OptionsForTesting<T> {
  _resolvedOpts?: T
}