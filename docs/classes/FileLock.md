[**@ayapapa-npm/file-locking-js**](../api.md)

***

[@ayapapa-npm/file-locking-js](../api.md) / FileLock

# Class: FileLock

Defined in: [src/lib/FileLock.ts:36](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/FileLock.ts#L36)

File locking. 
Acquires a lock by creating a file derived from the specified key, executes the provided callback, and then releases the lock (by deleting the created file). 
While the file exists, no other lock can be acquired for the same key. 
Settings such as `timeoutMs` allow for waiting until an unreleased lock is freed.

## Extends

- `LockBase`\<`FileLockAllOptions`, `FileLockInternalState`\>

## Properties

### \_acquired

> `protected` **\_acquired**: `boolean` = `false`

Defined in: [src/lib/LockBase.ts:181](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/LockBase.ts#L181)

**`Internal`**

Whether or not a lock is acquired.

#### Inherited from

`LockBase._acquired`

***

### \_key

> `protected` **\_key**: `string`

Defined in: [src/lib/LockBase.ts:193](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/LockBase.ts#L193)

**`Internal`**

Lock key

#### Inherited from

`LockBase._key`

***

### \_logger

> `protected` **\_logger**: `Required`\<[`LogProvider`](../type-aliases/LogProvider.md)\>

Defined in: [src/lib/LockBase.ts:199](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/LockBase.ts#L199)

**`Internal`**

Logger.

#### Inherited from

`LockBase._logger`

***

### \_ownerId

> `protected` **\_ownerId**: `string`

Defined in: [src/lib/LockBase.ts:205](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/LockBase.ts#L205)

**`Internal`**

Lock owner ID to be stored in the lock file.

#### Inherited from

`LockBase._ownerId`

***

### \_config

> `protected` `static` **\_config**: `Required`\<`LockBaseConfig`\>

Defined in: [src/lib/LockBase.ts:48](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/LockBase.ts#L48)

**`Internal`**

Current basic configurations.

#### Inherited from

`LockBase._config`

***

### \_lastOptions

> `protected` `static` **\_lastOptions**: `FileLockRequiredOptions` \| `null` = `null`

Defined in: [src/lib/FileLock.ts:47](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/FileLock.ts#L47)

**`Internal`**

Store the recently used options (options resolved within the static `withLock()` method). 
Normally, there is no need to store them statically because new options are resolved with each call to `withLock()`, but they are stored here for testing purposes.

***

### \_logger

> `protected` `static` **\_logger**: `Required`\<[`LogProvider`](../type-aliases/LogProvider.md)\>

Defined in: [src/lib/LockBase.ts:54](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/LockBase.ts#L54)

**`Internal`**

Logger.

#### Inherited from

`LockBase._logger`

## Methods

### \_acquire()

> `protected` **\_acquire**(`options`): `Promise`\<`void`\>

Defined in: [src/lib/FileLock.ts:395](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/FileLock.ts#L395)

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

### \_debugLog()

> `protected` **\_debugLog**(...`args`): `void`

Defined in: [src/lib/LockBase.ts:254](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/LockBase.ts#L254)

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

Defined in: [src/lib/FileLock.ts:450](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/FileLock.ts#L450)

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

Defined in: [src/lib/FileLock.ts:472](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/FileLock.ts#L472)

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

### \_interruptPromise()

> `abstract` `protected` **\_interruptPromise**(): \{ `promise`: `Promise`\<`unknown`\>; `reject`: (`r?`) => `void`; `resolve`: (`v`) => `void`; \} \| `undefined`

Defined in: [src/lib/FileLock.ts:484](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/FileLock.ts#L484)

★★★これ、本当に継承クラス？？？親クラスでも良くない？？？？　となると、割り込みかどうかだけ、判定するのが、継承クラスのやくめ？？
でも、そのほかのえらーはどうすんの？IOエラーとかもあるんだけれど、、、、などなど

#### Returns

\{ `promise`: `Promise`\<`unknown`\>; `reject`: (`r?`) => `void`; `resolve`: (`v`) => `void`; \} \| `undefined`

A `promise` for detecting interrupt processing, along with its `resolve` and `reject` functions.

#### Interna

Create a promise for interrupt detection.<br>
This method is intended to be overridden in subclasses as needed.

#### Overrides

`LockBase._interruptPromise`

***

### \_isDebug()

> `protected` **\_isDebug**(): `boolean`

Defined in: [src/lib/LockBase.ts:299](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/LockBase.ts#L299)

**`Internal`**

Get debug mode.

#### Returns

`boolean`

`true` if debug mode is on.

#### Inherited from

`LockBase._isDebug`

***

### \_isInterrupt()

> `protected` **\_isInterrupt**(`err`): `boolean`

Defined in: [src/lib/FileLock.ts:504](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/FileLock.ts#L504)

**`Internal`**

Determines whether an error that has occurred is an expected error (an interruption). 
This method is intended to be overridden in conjunction with the `_interruptPromise` method. (See the `_interruptPromise` method.)

#### Parameters

##### err

`unknown`

#### Returns

`boolean`

Returns `true` if it is an expected error, otherwise `false`.

#### Overrides

`LockBase._isInterrupt`

***

### \_onError()

> `abstract` `protected` **\_onError**(`err`, `operation`, `options`, `codeIfNon?`): `void`

Defined in: [src/lib/LockBase.ts:325](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/LockBase.ts#L325)

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

`AllOptions`\<`FileLockAllOptions`, `FileLockInternalState`\>

Lock options.

##### codeIfNon?

`string` = `'ELOCK'`

Error code.

#### Returns

`void`

#### Inherited from

`LockBase._onError`

***

### \_onExit()

> `abstract` `protected` **\_onExit**(`code`, `signal`): `void`

Defined in: [src/lib/LockBase.ts:343](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/LockBase.ts#L343)

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

Defined in: [src/lib/FileLock.ts:513](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/FileLock.ts#L513)

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

Defined in: [src/lib/FileLock.ts:534](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/FileLock.ts#L534)

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

### \_withLock()

> `abstract` `protected` **\_withLock**(`onLockFn`, `options`): `Promise`\<`unknown`\>

Defined in: [src/lib/LockBase.ts:392](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/LockBase.ts#L392)

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

Defined in: [src/lib/LockBase.ts:92](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/LockBase.ts#L92)

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

Defined in: [src/lib/LockBase.ts:102](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/LockBase.ts#L102)

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

Defined in: [src/lib/FileLock.ts:100](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/FileLock.ts#L100)

**`Internal`**

Initialize.

#### Returns

`void`

***

### \_resolveLogger()

> `protected` `static` **\_resolveLogger**(`config`): `Required`\<[`LogProvider`](../type-aliases/LogProvider.md)\>

Defined in: [src/lib/LockBase.ts:121](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/LockBase.ts#L121)

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

Defined in: [src/lib/FileLock.ts:106](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/FileLock.ts#L106)

Get current configurations.

#### Returns

`Required`\<[`FileLockConfig`](../interfaces/FileLockConfig.md)\>

***

### getDefaultConfig()

> `static` **getDefaultConfig**(): `Required`\<[`FileLockConfig`](../interfaces/FileLockConfig.md)\>

Defined in: [src/lib/FileLock.ts:111](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/FileLock.ts#L111)

Get default configurations.

#### Returns

`Required`\<[`FileLockConfig`](../interfaces/FileLockConfig.md)\>

***

### getDefaultOptions()

> `static` **getDefaultOptions**(): `FileLockRequiredOptions`

Defined in: [src/lib/FileLock.ts:119](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/FileLock.ts#L119)

Get default options(`FileLockOptions`).

#### Returns

`FileLockRequiredOptions`

Deault options.

***

### getHistoryInfo()

> `static` **getHistoryInfo**(): `Readonly`\<\{ `historyEnabled`: `boolean`; `historyId`: `string`; `historyPath`: `string`; `processId`: `number`; \}\>

Defined in: [src/lib/FileLock.ts:127](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/FileLock.ts#L127)

Get the history informations.

#### Returns

`Readonly`\<\{ `historyEnabled`: `boolean`; `historyId`: `string`; `historyPath`: `string`; `processId`: `number`; \}\>

Returns the history permission flag, history identifier, history file path, and process identification.

***

### onExit()

> `static` **onExit**(`code`, `signal`): `void`

Defined in: [src/lib/LockBase.ts:82](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/LockBase.ts#L82)

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

Defined in: [src/lib/FileLock.ts:142](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/FileLock.ts#L142)

Resets the current settings to their default values.

#### Returns

`void`

***

### setConfig()

> `static` **setConfig**(`config`): `void`

Defined in: [src/lib/FileLock.ts:152](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/FileLock.ts#L152)

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

Defined in: [src/lib/FileLock.ts:206](https://github.com/ayapapa/file-lock-js/blob/13f803644002542109a9ded74c561eb18b7ee91c/src/lib/FileLock.ts#L206)

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
