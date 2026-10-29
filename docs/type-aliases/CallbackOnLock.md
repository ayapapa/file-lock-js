[**@ayapapa-npm/file-lock-js**](../api.md)

***

[@ayapapa-npm/file-lock-js](../api.md) / CallbackOnLock

# Type Alias: CallbackOnLock\<T\>

> **CallbackOnLock**\<`T`\> = (`monitor`) => [`MaybePromise`](MaybePromise.md)\<`T`\>

Defined in: [src/lib/LockBase.ts:43](https://github.com/ayapapa/file-lock-js/blob/5451d71cbfa3ccf417ddd6ff2007a3d6224285d7/src/lib/LockBase.ts#L43)

Definition of the callback function to be executed after acquiring the lock.

## Type Parameters

### T

`T`

## Parameters

### monitor

[`LockMonitor`](../interfaces/LockMonitor.md)

## Returns

[`MaybePromise`](MaybePromise.md)\<`T`\>
