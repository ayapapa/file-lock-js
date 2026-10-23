[**@ayapapa-npm/file-lock-js**](../api.md)

***

[@ayapapa-npm/file-lock-js](../api.md) / FileLock

# Class: FileLock

Defined in: [src/lib/FileLock.ts:91](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/FileLock.ts#L91)

File locking. 
Acquires a lock by creating a file derived from the specified key, executes the provided callback, and then releases the lock (by deleting the created file). 
While the file exists, no other lock can be acquired for the same key. 
Settings such as `timeoutMs` allow for waiting until an unreleased lock is freed.

## Extends

- `LockBase`\<`FileLockAllOptions`, `FileLockInternalState`\>

## Properties

### \_key

> `protected` **\_key**: `string`

Defined in: [src/lib/LockBase.ts:187](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/LockBase.ts#L187)

**`Internal`**

Lock key

#### Inherited from

`LockBase._key`

***

### \_logger

> `protected` **\_logger**: `Required`\<[`LogProvider`](../type-aliases/LogProvider.md)\>

Defined in: [src/lib/LockBase.ts:193](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/LockBase.ts#L193)

**`Internal`**

Logger.

#### Inherited from

`LockBase._logger`

***

### \_ownerId

> `protected` **\_ownerId**: `string`

Defined in: [src/lib/LockBase.ts:199](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/LockBase.ts#L199)

**`Internal`**

Lock owner ID to be stored in the lock file.

#### Inherited from

`LockBase._ownerId`

***

### \_config

> `protected` `static` **\_config**: `Required`\<`LockBaseConfig`\>

Defined in: [src/lib/LockBase.ts:48](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/LockBase.ts#L48)

**`Internal`**

Current basic configurations.

#### Inherited from

`LockBase._config`

***

### \_logger

> `protected` `static` **\_logger**: `Required`\<[`LogProvider`](../type-aliases/LogProvider.md)\>

Defined in: [src/lib/LockBase.ts:54](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/LockBase.ts#L54)

**`Internal`**

Logger.

#### Inherited from

`LockBase._logger`

## Accessors

### \_acquired

#### Get Signature

> **get** `protected` **\_acquired**(): `boolean`

Defined in: [src/lib/LockBase.ts:181](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/LockBase.ts#L181)

**`Internal`**

Whether or not a lock is acquired.

##### Returns

`boolean`

#### Inherited from

`LockBase._acquired`

***

### \_isALiveHeartbeatTimer

#### Get Signature

> **get** `protected` **\_isALiveHeartbeatTimer**(): `boolean`

Defined in: [src/lib/FileLock.ts:412](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/FileLock.ts#L412)

**`Internal`**

##### Returns

`boolean`

## Methods

### \_acquire()

> `protected` **\_acquire**(`options`): `Promise`\<`void`\>

Defined in: [src/lib/FileLock.ts:423](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/FileLock.ts#L423)

**`Internal`**

Acquire the lock. 
In practice, if a lock is already held, wait for it to be released before acquiring the lock. 
Throw an error (exception) if the specified timeout is exceeded.

#### Parameters

##### options

`AllOptions`

Lock options.

#### Returns

`Promise`\<`void`\>

#### Overrides

`LockBase._acquire`

***

### \_acquireSync()

> `protected` **\_acquireSync**(`_`): `void`

Defined in: [src/lib/LockBase.ts:246](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/LockBase.ts#L246)

#### Parameters

##### \_

`AllOptions`\<`FileLockAllOptions`, `FileLockInternalState`\>

#### Returns

`void`

#### Inherited from

`LockBase._acquireSync`

***

### \_debugLog()

> `protected` **\_debugLog**(...`args`): `void`

Defined in: [src/lib/LockBase.ts:257](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/LockBase.ts#L257)

**`Internal`**

Outputs a debug log.<br>
Outputs via `logger.log()` only when `_debug` in the configuration (the `config` constructor argument) is set to `true`.
Headers (such as [DEBUG]) are not automatically added.

#### Parameters

##### args

...`unknown`[]

The arguments passed to `logger.log()`.

#### Returns

`void`

#### Inherited from

`LockBase._debugLog`

***

### \_decReantryCount()

> `protected` **\_decReantryCount**(`options`): `Promise`\<`void`\>

Defined in: [src/lib/FileLock.ts:480](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/FileLock.ts#L480)

**`Internal`**

Decrement lock counter.
And, when the counter becomes '0', release lock.

#### Parameters

##### options

`AllOptions`

Lock options.

#### Returns

`Promise`\<`void`\>

#### Overrides

`LockBase._decReantryCount`

***

### \_incReantryCount()

> `protected` **\_incReantryCount**(`options`): `Promise`\<`void`\>

Defined in: [src/lib/FileLock.ts:502](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/FileLock.ts#L502)

**`Internal`**

Increment lock counter.

#### Parameters

##### options

`AllOptions`

Lock options.

#### Returns

`Promise`\<`void`\>

#### Overrides

`LockBase._incReantryCount`

***

### \_isAlreadyCancelled()

> `protected` **\_isAlreadyCancelled**(`options`): `boolean`

Defined in: [src/lib/LockBase.ts:289](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/LockBase.ts#L289)

**`Internal`**

Check whether it has been cancelled.

#### Parameters

##### options

`AllOptions`\<`FileLockAllOptions`, `FileLockInternalState`\>

Lock options.

#### Returns

`boolean`

#### Inherited from

`LockBase._isAlreadyCancelled`

***

### \_isDebug()

> `protected` **\_isDebug**(): `boolean`

Defined in: [src/lib/LockBase.ts:298](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/LockBase.ts#L298)

**`Internal`**

Get debug mode.

#### Returns

`boolean`

`true` if debug mode is on.

#### Inherited from

`LockBase._isDebug`

***

### \_onDoneOrCancelled()

> `abstract` `protected` **\_onDoneOrCancelled**(`_options`): `void`

Defined in: [src/lib/FileLock.ts:513](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/FileLock.ts#L513)

**`Internal`**

A synchronous function that is called immediately 
after a lock callback completes or is cancelled (due to an error).

#### Parameters

##### \_options

`AllOptions`

#### Returns

`void`

#### Overrides

`LockBase._onDoneOrCancelled`

***

### \_onError()

> `protected` **\_onError**(`err`, `operation`, `options`, `codeIfNon?`): `void`

Defined in: [src/lib/FileLock.ts:525](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/FileLock.ts#L525)

**`Internal`**

Handle errors that occur while locked.

#### Parameters

##### err

`unknown`

Error instance.

##### operation

`string`

Operation description

##### options

`AllOptions`

Lock options.

##### codeIfNon?

`string` = `'ELOCK'`

Error code.

#### Returns

`void`

#### Overrides

`LockBase._onError`

***

### \_onExit()

> `abstract` `protected` **\_onExit**(`code`, `signal`): `void`

Defined in: [src/lib/LockBase.ts:348](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/LockBase.ts#L348)

**`Internal`**

Execute termination processing.<br>
In the Windows version, this is not called upon forced termination (process.kill()), but the implementation is being retained.

#### Parameters

##### code

`number` \| `null` \| `undefined`

Exit code.

##### signal

`Signals` \| `null`

Recieved signal.

#### Returns

`void`

#### Inherited from

`LockBase._onExit`

***

### \_prepare()

> `protected` **\_prepare**(`options`): `void`

Defined in: [src/lib/FileLock.ts:554](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/FileLock.ts#L554)

**`Internal`**

Make advance preparations.

#### Parameters

##### options

`AllOptions`

Options

#### Returns

`void`

#### Overrides

`LockBase._prepare`

***

### \_release()

> `protected` **\_release**(`options`): `Promise`\<`void`\>

Defined in: [src/lib/FileLock.ts:575](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/FileLock.ts#L575)

**`Internal`**

Release lock. <br>
In practice, the counter is decremented, and the lock is released when it reaches zero.

#### Parameters

##### options

`AllOptions`

Lock options.

#### Returns

`Promise`\<`void`\>

#### Overrides

`LockBase._release`

***

### \_releaseSync()

> `protected` **\_releaseSync**(`_`): `void`

Defined in: [src/lib/LockBase.ts:391](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/LockBase.ts#L391)

#### Parameters

##### \_

`AllOptions`\<`FileLockAllOptions`, `FileLockInternalState`\>

#### Returns

`void`

#### Inherited from

`LockBase._releaseSync`

***

### \_withLock()

> `abstract` `protected` **\_withLock**(`onLockFn`, `options`): `Promise`\<`unknown`\>

Defined in: [src/lib/LockBase.ts:406](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/LockBase.ts#L406)

**`Internal`**

Acquires a lock for the specified key,
executes the function `onLockFn` under exclusive control, 
and returns a Promise that resolves with the return value of `onLockFn` after the lock is released.

#### Parameters

##### onLockFn

[`CallbackOnLock`](../type-aliases/CallbackOnLock.md)

A user-specified callback function to be executed after acquiring the lock.

##### options

`AllOptions`\<`FileLockAllOptions`, `FileLockInternalState`\>

Lock options.

#### Returns

`Promise`\<`unknown`\>

A `Promise` that resolves with the return value of `onLockFn`.

#### Inherited from

`LockBase._withLock`

***

### \_addOnExit()

> `protected` `static` **\_addOnExit**(`fn`): `void`

Defined in: [src/lib/LockBase.ts:92](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/LockBase.ts#L92)

**`Internal`**

Register an additional handler for the termination event.

#### Parameters

##### fn

(`code`, `signal`) => `void`

The termination callback function to register.

#### Returns

`void`

#### Inherited from

`LockBase._addOnExit`

***

### \_copyConfig()

> `protected` `static` **\_copyConfig**\<`T`\>(`config`): `T`

Defined in: [src/lib/LockBase.ts:102](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/LockBase.ts#L102)

**`Internal`**

Copy config.

#### Type Parameters

##### T

`T` *extends* `LockBaseConfig`

#### Parameters

##### config

`T`

Configurations.

#### Returns

`T`

#### Inherited from

`LockBase._copyConfig`

***

### \_initialize()

> `static` **\_initialize**(): `void`

Defined in: [src/lib/FileLock.ts:148](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/FileLock.ts#L148)

**`Internal`**

Initialize.

#### Returns

`void`

***

### \_resolveLogger()

> `protected` `static` **\_resolveLogger**(`config`): `Required`\<[`LogProvider`](../type-aliases/LogProvider.md)\>

Defined in: [src/lib/LockBase.ts:121](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/LockBase.ts#L121)

**`Internal`**

Get a logger where all methods are mandatory.

#### Parameters

##### config

`Required`\<`LockBaseConfig`\>

#### Returns

`Required`\<[`LogProvider`](../type-aliases/LogProvider.md)\>

A logger where all methods are mandatory.

#### Inherited from

`LockBase._resolveLogger`

***

### getConfig()

> `static` **getConfig**(): `Required`\<[`FileLockConfig`](../interfaces/FileLockConfig.md)\>

Defined in: [src/lib/FileLock.ts:154](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/FileLock.ts#L154)

Get current configurations.

#### Returns

`Required`\<[`FileLockConfig`](../interfaces/FileLockConfig.md)\>

***

### getDefaultConfig()

> `static` **getDefaultConfig**(): `Required`\<[`FileLockConfig`](../interfaces/FileLockConfig.md)\>

Defined in: [src/lib/FileLock.ts:159](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/FileLock.ts#L159)

Get default configurations.

#### Returns

`Required`\<[`FileLockConfig`](../interfaces/FileLockConfig.md)\>

***

### getDefaultOptions()

> `static` **getDefaultOptions**(): `FileLockRequiredOptions`

Defined in: [src/lib/FileLock.ts:167](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/FileLock.ts#L167)

Get default options(`FileLockOptions`).

#### Returns

`FileLockRequiredOptions`

Deault options.

***

### getHistoryInfo()

> `static` **getHistoryInfo**(): `Readonly`\<\{ `historyEnabled`: `boolean`; `historyId`: `string`; `historyPath`: `string`; `processId`: `number`; \}\>

Defined in: [src/lib/FileLock.ts:175](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/FileLock.ts#L175)

Get the history informations.

#### Returns

`Readonly`\<\{ `historyEnabled`: `boolean`; `historyId`: `string`; `historyPath`: `string`; `processId`: `number`; \}\>

Returns the history permission flag, history identifier, history file path, and process identification.

***

### onExit()

> `static` **onExit**(`code`, `signal`): `void`

Defined in: [src/lib/LockBase.ts:82](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/LockBase.ts#L82)

**`Internal`**

Termination processing. 
On Windows, this is not called upon forced termination (process.kill()), but the implementation is retained.

#### Parameters

##### code

`number` \| `null` \| `undefined`

##### signal

`Signals` \| `null`

#### Returns

`void`

#### Inherited from

`LockBase.onExit`

***

### resetConfig()

> `static` **resetConfig**(): `void`

Defined in: [src/lib/FileLock.ts:190](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/FileLock.ts#L190)

Resets the current settings to their default values.

#### Returns

`void`

***

### setConfig()

> `static` **setConfig**(`config`): `void`

Defined in: [src/lib/FileLock.ts:200](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/FileLock.ts#L200)

Set configurations.<br>
Overwrite part of the current settings. 
At the same time, the cache is cleared.

#### Parameters

##### config

[`FileLockConfig`](../interfaces/FileLockConfig.md)

Lock configurations.

#### Returns

`void`

#### Overrides

`LockBase.setConfig`

***

### withLock()

> `static` **withLock**(`key`, `onLockFn`, `options?`): `Promise`\<`unknown`\>

Defined in: [src/lib/FileLock.ts:254](https://github.com/ayapapa/file-lock-js/blob/5470f3baf6e14b03928558ff9498279e4c5a8d88/src/lib/FileLock.ts#L254)

Acquires a lock for the specified key, executes the function `onLockFn` under exclusive control, 
and returns a Promise that resolves with the return value of `onLockFn` after the lock is released.

#### Parameters

##### key

`string`

Lock key.
If the specified key contains characters that are invalid for a file path, 
it is converted into a valid file path by replacing those characters with underscores 
and removing double quotation marks.

##### onLockFn

[`CallbackOnLock`](../type-aliases/CallbackOnLock.md)

Callback function to execute while the lock is held.
                 Both synchronous and asynchronous functions can be specified.

##### options?

[`FileLockOptions`](../interfaces/FileLockOptions.md) = `{}`

Lock options.

#### Returns

`Promise`\<`unknown`\>

A Promise that resolves with the return value of onLockFn.
