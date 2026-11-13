[**@ayapapa-npm/file-lock-js**](../api.md)

***

[@ayapapa-npm/file-lock-js](../api.md) / FileLock

# Class: FileLock

Defined in: [src/lib/FileLock.ts:14](https://github.com/ayapapa/file-lock-js/blob/e068e890c5be6dc2f1ef7ce9a3526d7905ac5b45/src/lib/FileLock.ts#L14)

File-based lock class. 
Acquires a lock by creating a file derived from the specified key, executes the provided callback, and then releases the lock (by deleting the created file). 
While the file exists, no other lock can be acquired for the same key. 
Settings such as `timeoutMs` allow for waiting until an unreleased lock is freed.

## Constructors

### Constructor

> **new FileLock**(): `FileLock`

#### Returns

`FileLock`

## Accessors

### defaultConfig

#### Get Signature

> **get** `static` **defaultConfig**(): [`FileLockConfig`](../interfaces/FileLockConfig.md)

Defined in: [src/lib/FileLock.ts:25](https://github.com/ayapapa/file-lock-js/blob/e068e890c5be6dc2f1ef7ce9a3526d7905ac5b45/src/lib/FileLock.ts#L25)

Get default configurations.

##### Returns

[`FileLockConfig`](../interfaces/FileLockConfig.md)

***

### defaultOptions

#### Get Signature

> **get** `static` **defaultOptions**(): [`FileLockOptions`](../interfaces/FileLockOptions.md)

Defined in: [src/lib/FileLock.ts:33](https://github.com/ayapapa/file-lock-js/blob/e068e890c5be6dc2f1ef7ce9a3526d7905ac5b45/src/lib/FileLock.ts#L33)

Get default options.

##### Returns

[`FileLockOptions`](../interfaces/FileLockOptions.md)

Default options.

***

### historyInfo

#### Get Signature

> **get** `static` **historyInfo**(): `Readonly`\<\{ `historyEnabled`: `boolean`; `historyId`: `string`; `historyPath`: `string`; `processId`: `number`; \}\>

Defined in: [src/lib/FileLock.ts:41](https://github.com/ayapapa/file-lock-js/blob/e068e890c5be6dc2f1ef7ce9a3526d7905ac5b45/src/lib/FileLock.ts#L41)

Get the history informations.

##### Returns

`Readonly`\<\{ `historyEnabled`: `boolean`; `historyId`: `string`; `historyPath`: `string`; `processId`: `number`; \}\>

Returns the history permission flag, history identifier, history file path, and process identification.

***

### lockDir

#### Get Signature

> **get** `static` **lockDir**(): `string`

Defined in: [src/lib/FileLock.ts:51](https://github.com/ayapapa/file-lock-js/blob/e068e890c5be6dc2f1ef7ce9a3526d7905ac5b45/src/lib/FileLock.ts#L51)

Get `lock directory`

##### Returns

`string`

## Methods

### getConfig()

> `static` **getConfig**(): [`FileLockConfig`](../interfaces/FileLockConfig.md)

Defined in: [src/lib/FileLock.ts:20](https://github.com/ayapapa/file-lock-js/blob/e068e890c5be6dc2f1ef7ce9a3526d7905ac5b45/src/lib/FileLock.ts#L20)

Get current configurations.

#### Returns

[`FileLockConfig`](../interfaces/FileLockConfig.md)

***

### resetConfig()

> `static` **resetConfig**(): `void`

Defined in: [src/lib/FileLock.ts:54](https://github.com/ayapapa/file-lock-js/blob/e068e890c5be6dc2f1ef7ce9a3526d7905ac5b45/src/lib/FileLock.ts#L54)

Resets the current settings to their default values.

#### Returns

`void`

***

### setConfig()

> `static` **setConfig**(`config`): `void`

Defined in: [src/lib/FileLock.ts:64](https://github.com/ayapapa/file-lock-js/blob/e068e890c5be6dc2f1ef7ce9a3526d7905ac5b45/src/lib/FileLock.ts#L64)

Set configurations.<br>
Overwrite part of the current settings. 
At the same time, the cache is cleared.

#### Parameters

##### config

[`FileLockConfig`](../interfaces/FileLockConfig.md)

Lock configurations.

#### Returns

`void`

***

### withLock()

> `static` **withLock**\<`T`\>(`key`, `onLockFn`, `options?`): `Promise`\<`T`\>

Defined in: [src/lib/FileLock.ts:87](https://github.com/ayapapa/file-lock-js/blob/e068e890c5be6dc2f1ef7ce9a3526d7905ac5b45/src/lib/FileLock.ts#L87)

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

[`FileLockOptions`](../interfaces/FileLockOptions.md) = `{}`

Lock options.

#### Returns

`Promise`\<`T`\>

A Promise that resolves with the return value of onLockFn.

#### Throws

[InvalidOptions](InvalidOptions.md) Invalid options.

#### Throws

[AlreadyLocked](AlreadyLocked.md)  Failed to acquire the lock within the specified time. See [FileLockOptions](../interfaces/FileLockOptions.md)'s `timeoutMs`.

#### Throws

[TTLExceeded](TTLExceeded.md)  Failed to release the lock within the specified time. See [FileLockOptions](../interfaces/FileLockOptions.md)'s`ttlMs`.

#### Throws

[DeadlockDetected](DeadlockDetected.md) A deadlock has been detected. See [FileLockOptions](../interfaces/FileLockOptions.md)'s `allowReentry`.

#### Throws

[LockDirectoryCreationFailed](LockDirectoryCreationFailed.md) Failed to create the `lock directory`.

#### Throws

[LockCompromised](LockCompromised.md) The lock was compromised during the locking process.
