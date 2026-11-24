[**@ayapapa-npm/file-lock-js**](../api.md)

***

[@ayapapa-npm/file-lock-js](../api.md) / FileLockInterface

# Interface: FileLockInterface

Defined in: [src/lib/FileLock.ts:8](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/FileLock.ts#L8)

Interface of FileLock.

## Accessors

### defaultConfig

#### Get Signature

> **get** **defaultConfig**(): [`FileLockConfig`](FileLockConfig.md)

Defined in: [src/lib/FileLock.ts:12](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/FileLock.ts#L12)

Get default configurations.

##### Returns

[`FileLockConfig`](FileLockConfig.md)

***

### defaultOptions

#### Get Signature

> **get** **defaultOptions**(): [`FileLockOptions`](FileLockOptions.md)

Defined in: [src/lib/FileLock.ts:14](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/FileLock.ts#L14)

Get default options.

##### Returns

[`FileLockOptions`](FileLockOptions.md)

***

### historyInfo

#### Get Signature

> **get** **historyInfo**(): `Readonly`\<\{ `historyEnabled`: `boolean`; `historyId`: `string`; `historyPath`: `string`; `processId`: `number`; \}\>

Defined in: [src/lib/FileLock.ts:16](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/FileLock.ts#L16)

Get the history informations.

##### Returns

`Readonly`\<\{ `historyEnabled`: `boolean`; `historyId`: `string`; `historyPath`: `string`; `processId`: `number`; \}\>

***

### lockDir

#### Get Signature

> **get** **lockDir**(): `string`

Defined in: [src/lib/FileLock.ts:23](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/FileLock.ts#L23)

Get `lock directory`

##### Returns

`string`

***

### numberOfQueues

#### Get Signature

> **get** **numberOfQueues**(): `number`

Defined in: [src/lib/FileLock.ts:29](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/FileLock.ts#L29)

get number of queues.
The initial value matches `maxConcurrency`. 
If any `extra queue`s are created, their count is also included.

##### Returns

`number`

## Methods

### getConfig()

> **getConfig**(): `Readonly`\<[`FileLockConfig`](FileLockConfig.md)\>

Defined in: [src/lib/FileLock.ts:10](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/FileLock.ts#L10)

Get current configurations.

#### Returns

`Readonly`\<[`FileLockConfig`](FileLockConfig.md)\>

***

### resetConfig()

> **resetConfig**(): `void`

Defined in: [src/lib/FileLock.ts:31](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/FileLock.ts#L31)

Resets the current settings to their default values.

#### Returns

`void`

***

### setConfig()

> **setConfig**(`config`): `void`

Defined in: [src/lib/FileLock.ts:35](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/FileLock.ts#L35)

Set configurations. Overwrite part of the current settings.
At the same time, the cache is cleared.

#### Parameters

##### config

[`FileLockConfig`](FileLockConfig.md)

#### Returns

`void`

***

### withLock()

> **withLock**\<`T`\>(`key`, `onLockFn`, `options?`): `Promise`\<`T`\>

Defined in: [src/lib/FileLock.ts:55](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/FileLock.ts#L55)

Acquires a lock for the specified key, executes the function `onLockFn` under exclusive control, 
and returns a Promise that resolves with the return value of `onLockFn` after the lock is released.

#### Type Parameters

##### T

`T`

#### Parameters

##### key

`string`

Lock key.
If the specified key contains characters that are invalid for a file path, 
it is converted into a valid file path by replacing those characters with underscores 
and removing double quotation marks.

##### onLockFn

[`CallbackOnLock`](../type-aliases/CallbackOnLock.md)\<`T`\>

Callback function to execute while the lock is held.
                 Both synchronous and asynchronous functions can be specified.

##### options?

[`FileLockOptions`](FileLockOptions.md)

Lock options.

#### Returns

`Promise`\<`T`\>

A Promise that resolves with the return value of onLockFn.

#### Throws

[InvalidOptions](../classes/InvalidOptions.md) Invalid options.

#### Throws

[AlreadyLocked](../classes/AlreadyLocked.md)  Failed to acquire the lock within the specified time. See [FileLockOptions](FileLockOptions.md)'s `timeoutMs`.

#### Throws

[TTLExceeded](../classes/TTLExceeded.md)  Failed to release the lock within the specified time. See [FileLockOptions](FileLockOptions.md)'s`ttlMs`.

#### Throws

[DeadlockDetected](../classes/DeadlockDetected.md) A deadlock has been detected. See [FileLockOptions](FileLockOptions.md)'s `allowReentry`.

#### Throws

[LockDirectoryCreationFailed](../classes/LockDirectoryCreationFailed.md) Failed to create the `lock directory`.

#### Throws

[LockCompromised](../classes/LockCompromised.md) The lock was compromised during the locking process.
