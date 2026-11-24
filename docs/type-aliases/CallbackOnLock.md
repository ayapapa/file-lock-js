[**@ayapapa-npm/file-lock-js**](../api.md)

***

[@ayapapa-npm/file-lock-js](../api.md) / CallbackOnLock

# Type Alias: CallbackOnLock\<T\>

> **CallbackOnLock**\<`T`\> = (`monitor`) => [`MaybePromise`](MaybePromise.md)\<`T`\>

Defined in: [src/lib/LockBase.ts:60](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/LockBase.ts#L60)

Definition of the callback function to be executed after acquiring the lock.

## Type Parameters

### T

`T`

## Parameters

### monitor

[`LockMonitor`](../interfaces/LockMonitor.md)

## Returns

[`MaybePromise`](MaybePromise.md)\<`T`\>
