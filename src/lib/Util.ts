//import type { LockBase } from "./LockBase.ts";
import { type LockBaseConfig } from "./LockBaseConfig.ts";
import { type LockBaseOptions } from "./LockBaseOptions.ts";
import { REQUIRE, REQUIRE_DEBUG, type ErrorClassType } from "./Contracts.ts";
import { LockError } from "./LockBaseErrors.ts";

/** 
 * @internal
 * Types of time-based key.
 */
export type TimeBasedKey<T> = {
  [K in keyof T]:
    K extends `${infer Base}Sec`
      ? `${Base}Ms` extends keyof T
        ? Base
        : never
      : never
}[keyof T];

/** 
 * @internal
 * Type of Key-Type map.
 */
export type KeyTypeMap<T> = Record<keyof T, unknown>;

/** 
 * @internal
 * Asynchronous sleep. 
 */
export async function sleepAsync(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * @internal
 * Synchronous sleep. 
 */
/*
export function sleepSync(ms: number) {
  const sab = new SharedArrayBuffer(4);
  const int32 = new Int32Array(sab);
  Atomics.wait(int32, 0, 0, ms);
}
*/
/**
 * @internal
 * Get callstack. 
 */
export function getCallStack(): string {
  const obj: { stack?: string } = {};
  Error.captureStackTrace(obj, getCallStack);
  obj.stack = obj.stack ? obj.stack.replace(/^Error\b/, "Call stack") : `Call stack: couldn't get.`;
  return obj.stack;
} 

/**
 * @internal
 * Check same type objects. 
 * @returns Returns true if they all have the same keys and the types of the corresponding values ​​also match.
 */
export function isEqualObjectType(o1: Record<string, unknown>, o2: Record<string, unknown>): boolean {
  if (Object.keys(o1).length !== Object.keys(o2).length) return false;
  for (const key in o1) {
    if (key in o2 === false || typeof o1[key] !== typeof o2[key]) return false;
  }
  return true;
}

/**
 * @internal
 * Check whether the object (`target`) possesses all keys of the `reference`.
 * @param target 
 * @param reference 
 * @param missings 
 * @returns If `target` has all keys of the `reference`, true;
 */
export function includesAllKeysOf<T extends object, R extends object>(target: T, reference: R | (keyof T)[], missings: string[] = []): boolean {
  const keys = (Array.isArray(reference) ? reference : Object.keys(reference)) as (keyof T)[];
  let ret = true;
  for (const key of keys) {
    if (target[key] == null) {
      ret = false;
      missings.push(String(key));
    }
  }
  missings.sort();
  return ret;
}

/** Enumerate typed object keys. */
export function typedKeys<O extends object>(obj: O): Array<keyof O> {
  return Object.keys(obj) as Array<keyof O>;
}

export function checkValuesType<T extends (LockBaseConfig | LockBaseOptions)>(target: T, reference: T, type: 'options' | 'configuration', ErrorClass: ErrorClassType) {
  REQUIRE_DEBUG(ErrorClass.name === 'InvalidConfiguration' || ErrorClass.name === 'InvalidOptions',
    "Invalid param.", LockError, { code: 'EINVAL', props: { name: 'ErrorClass' }}
  )
  const badKeys = [] as string[];
  const msg = `The specified ${type} contains values of invalid types.`;
  const t = target as Record<string, unknown>;
  const r = reference as Record<string, unknown>
  Object.keys(r).forEach(k => {
    if (t[k] != null) {
      if (typeof t[k] !== typeof r[k] || Array.isArray(t[k]) !== Array.isArray(r[k])) {
        badKeys.push(k);
      }
      else if (k === 'logger') {
        if (!includesAllKeysOf(t[k], ['trace', 'debug', 'log', 'info', 'warn', 'error']))
          badKeys.push(k);
      }
    }
  });

  REQUIRE(() => {
    if (badKeys.length > 0) {
      badKeys.sort();
      return false;
    }
    else return true;
  }, msg, ErrorClass, { name: badKeys.length === 1 ? badKeys[0] : badKeys });
}
/*
export function checkValuesType<T extends (LockBaseConfig | LockBaseOptions)>(target: T, reference: T, type: 'options' | 'configuration', ErrorClass: ErrorClassType) {
  let badKeys = [] as string[];
  const msg = `The specified ${type} contains values of invalid types.`;
  const result = checkValuesType(target, reference, badKeys);
  REQUIRE(result, msg, ErrorClass, { code: 'EINVAL', props: { names: badKeys } });
}
*/