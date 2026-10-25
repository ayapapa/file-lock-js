[**@ayapapa-npm/file-lock-js**](../api.md)

***

[@ayapapa-npm/file-lock-js](../api.md) / FileLock

# Class: FileLock

Defined in: [src/lib/FileLock.ts:47](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/FileLock.ts#L47)

File locking. 
Acquires a lock by creating a file derived from the specified key, executes the provided callback, and then releases the lock (by deleting the created file). 
While the file exists, no other lock can be acquired for the same key. 
Settings such as `timeoutMs` allow for waiting until an unreleased lock is freed.

## Extends

- `LockBase`\<`FileLockAllOptions`, `FileLockInternalState`\>

## Accessors

### \_acquired

#### Get Signature

> **get** `protected` **\_acquired**(): `boolean`

Defined in: [src/lib/LockBase.ts:200](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/LockBase.ts#L200)

**`Internal`**

Whether or not a lock is acquired.

##### Returns

`boolean`

#### Inherited from

`LockBase._acquired`

***

### \_id

#### Get Signature

> **get** `protected` **\_id**(): `string`

Defined in: [src/lib/LockBase.ts:219](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/LockBase.ts#L219)

**`Internal`**

Lock instance ID. When a lock is acquired, 
this ID is stored within the "lock file" as the "owner ID" of the lock.

##### Returns

`string`

#### Inherited from

`LockBase._id`

***

### \_isALiveHeartbeatTimer

#### Get Signature

> **get** `protected` **\_isALiveHeartbeatTimer**(): `boolean`

Defined in: [src/lib/FileLock.ts:367](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/FileLock.ts#L367)

**`Internal`**

##### Returns

`boolean`

***

### \_isDebug

#### Get Signature

> **get** `protected` **\_isDebug**(): `boolean`

Defined in: [src/lib/LockBase.ts:323](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/LockBase.ts#L323)

**`Internal`**

Get debug mode.

##### Returns

`boolean`

`true` if debug mode is on.

#### Inherited from

`LockBase._isDebug`

***

### \_key

#### Get Signature

> **get** `protected` **\_key**(): `string`

Defined in: [src/lib/LockBase.ts:206](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/LockBase.ts#L206)

**`Internal`**

Lock key

##### Returns

`string`

#### Inherited from

`LockBase._key`

***

### \_logger

#### Get Signature

> **get** `protected` **\_logger**(): `Required`\<[`LogProvider`](../type-aliases/LogProvider.md)\>

Defined in: [src/lib/LockBase.ts:212](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/LockBase.ts#L212)

**`Internal`**

Logger.

##### Returns

`Required`\<[`LogProvider`](../type-aliases/LogProvider.md)\>

#### Inherited from

`LockBase._logger`

***

### \_config

#### Get Signature

> **get** `protected` `static` **\_config**(): `object`

Defined in: [src/lib/LockBase.ts:48](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/LockBase.ts#L48)

**`Internal`**

Current basic configurations.

##### Returns

###### \_debug

> **\_debug**: `boolean`

**`Internal`**

Indicates whether to execute in debug mode. <br>
If `true`:
- Process-related information is added to the lock information file.
- History tracking is enabled.
- If no logger is specified, or if `console` is specified as the logger, `trace` and `debug` logs from this library are output.   
This is a debug flag for this class and is intended for use only during development.
However, if an external logger is injected, it cannot be controlled; 
please adjust the log level yourself as necessary.
Default is `false`.

###### logger

> **logger**: [`LogProvider`](../type-aliases/LogProvider.md)

External logger. 
Default is `console`.

#### Inherited from

`LockBase._config`

***

### \_logger

#### Get Signature

> **get** `protected` `static` **\_logger**(): `Required`\<[`LogProvider`](../type-aliases/LogProvider.md)\>

Defined in: [src/lib/LockBase.ts:54](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/LockBase.ts#L54)

**`Internal`**

Logger.

##### Returns

`Required`\<[`LogProvider`](../type-aliases/LogProvider.md)\>

#### Inherited from

`LockBase._logger`

***

### \_onExitFns

#### Get Signature

> **get** `protected` `static` **\_onExitFns**(): (`code`, `signal`) => `void`[]

Defined in: [src/lib/LockBase.ts:60](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/LockBase.ts#L60)

**`Internal`**

Array of termination handler functions.

##### Returns

(`code`, `signal`) => `void`[]

#### Inherited from

`LockBase._onExitFns`

***

### lockDir

#### Get Signature

> **get** `static` **lockDir**(): `string`

Defined in: [src/lib/FileLock.ts:145](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/FileLock.ts#L145)

Get `lock directory`

##### Returns

`string`

## Methods

### \_acquire()

> `protected` **\_acquire**(`options`): `Promise`\<`void`\>

Defined in: [src/lib/FileLock.ts:378](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/FileLock.ts#L378)

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

Defined in: [src/lib/LockBase.ts:271](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/LockBase.ts#L271)

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

Defined in: [src/lib/LockBase.ts:282](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/LockBase.ts#L282)

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

Defined in: [src/lib/FileLock.ts:433](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/FileLock.ts#L433)

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

Defined in: [src/lib/FileLock.ts:455](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/FileLock.ts#L455)

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

Defined in: [src/lib/LockBase.ts:314](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/LockBase.ts#L314)

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

### \_onDoneOrCancelled()

> `abstract` `protected` **\_onDoneOrCancelled**(`_options`): `void`

Defined in: [src/lib/FileLock.ts:466](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/FileLock.ts#L466)

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

Defined in: [src/lib/FileLock.ts:478](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/FileLock.ts#L478)

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

Defined in: [src/lib/LockBase.ts:363](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/LockBase.ts#L363)

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

Defined in: [src/lib/FileLock.ts:488](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/FileLock.ts#L488)

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

Defined in: [src/lib/FileLock.ts:509](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/FileLock.ts#L509)

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

Defined in: [src/lib/LockBase.ts:398](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/LockBase.ts#L398)

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

Defined in: [src/lib/LockBase.ts:413](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/LockBase.ts#L413)

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

Defined in: [src/lib/LockBase.ts:110](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/LockBase.ts#L110)

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

Defined in: [src/lib/LockBase.ts:120](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/LockBase.ts#L120)

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

Defined in: [src/lib/FileLock.ts:103](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/FileLock.ts#L103)

**`Internal`**

Initialize.

#### Returns

`void`

***

### getConfig()

> `static` **getConfig**(): `Required`\<[`FileLockConfig`](../interfaces/FileLockConfig.md)\>

Defined in: [src/lib/FileLock.ts:109](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/FileLock.ts#L109)

Get current configurations.

#### Returns

`Required`\<[`FileLockConfig`](../interfaces/FileLockConfig.md)\>

***

### getDefaultConfig()

> `static` **getDefaultConfig**(): `Required`\<[`FileLockConfig`](../interfaces/FileLockConfig.md)\>

Defined in: [src/lib/FileLock.ts:114](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/FileLock.ts#L114)

Get default configurations.

#### Returns

`Required`\<[`FileLockConfig`](../interfaces/FileLockConfig.md)\>

***

### getDefaultOptions()

> `static` **getDefaultOptions**(): `FileLockRequiredOptions`

Defined in: [src/lib/FileLock.ts:122](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/FileLock.ts#L122)

Get default options(`FileLockOptions`).

#### Returns

`FileLockRequiredOptions`

Deault options.

***

### getHistoryInfo()

> `static` **getHistoryInfo**(): `Readonly`\<\{ `historyEnabled`: `boolean`; `historyId`: `string`; `historyPath`: `string`; `processId`: `number`; \}\>

Defined in: [src/lib/FileLock.ts:130](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/FileLock.ts#L130)

Get the history informations.

#### Returns

`Readonly`\<\{ `historyEnabled`: `boolean`; `historyId`: `string`; `historyPath`: `string`; `processId`: `number`; \}\>

Returns the history permission flag, history identifier, history file path, and process identification.

***

### onExit()

> `static` **onExit**(`code`, `signal`): `void`

Defined in: [src/lib/LockBase.ts:100](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/LockBase.ts#L100)

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

Defined in: [src/lib/FileLock.ts:148](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/FileLock.ts#L148)

Resets the current settings to their default values.

#### Returns

`void`

***

### setConfig()

> `static` **setConfig**(`config`): `void`

Defined in: [src/lib/FileLock.ts:158](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/FileLock.ts#L158)

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

Defined in: [src/lib/FileLock.ts:212](https://github.com/ayapapa/file-lock-js/blob/0f77366e952ce5e21a15a912cd1c628fe0d737c4/src/lib/FileLock.ts#L212)

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
