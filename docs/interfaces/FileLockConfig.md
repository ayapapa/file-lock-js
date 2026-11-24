[**@ayapapa-npm/file-lock-js**](../api.md)

***

[@ayapapa-npm/file-lock-js](../api.md) / FileLockConfig

# Interface: FileLockConfig

Defined in: [src/lib/FileLockConfig.ts:7](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/FileLockConfig.ts#L7)

FileLock cofiguration.

## Extends

- `LockBaseConfig`

## Properties

### cache?

> `optional` **cache?**: `boolean`

Defined in: [src/lib/FileLockConfig.ts:18](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/FileLockConfig.ts#L18)

Whether to enable caching for FileLock instances associated with a key.
Default is `true`.

***

### cacheTtlMs?

> `optional` **cacheTtlMs?**: `number`

Defined in: [src/lib/FileLockConfig.ts:33](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/FileLockConfig.ts#L33)

Cache expiration time (milliseconds). 
Valid only when `cache` is `true`.
Default and minimum `10000`.

***

### defaultOptions?

> `optional` **defaultOptions?**: [`FileLockOptions`](FileLockOptions.md)

Defined in: [src/lib/FileLockConfig.ts:40](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/FileLockConfig.ts#L40)

Global default options.
These are used as the default values ​​for options specified in `withLock()`.
Default is the return value of `FileLock.getDefaultOptions()`.

***

### lockDirectory?

> `optional` **lockDirectory?**: `string`

Defined in: [src/lib/FileLockConfig.ts:12](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/FileLockConfig.ts#L12)

Specifies the directory path to stored locking imformations.
Default is `${process.cwd()}/.lock` ('.lock' under the current working directory at runtime.)

***

### logger?

> `optional` **logger?**: [`LogProvider`](../type-aliases/LogProvider.md)

Defined in: [src/lib/LockBaseConfig.ts:14](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/LockBaseConfig.ts#L14)

External logger. 
Default is `console`.

#### Inherited from

`LockBaseConfig.logger`

***

### maxCacheEntries?

> `optional` **maxCacheEntries?**: `number`

Defined in: [src/lib/FileLockConfig.ts:26](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/FileLockConfig.ts#L26)

Maximum number of cache entries. 
Valid only when `cache` is `true`.
Minimum is `1`; if a value lower than this is specified, this minimum value is used.
Default is `100`.

***

### queueManager?

> `optional` **queueManager?**: [`QueueManager`](../classes/QueueManager.md)\<`string`\>

Defined in: [src/lib/LockBaseConfig.ts:22](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/LockBaseConfig.ts#L22)

Queue manager.
Specifying a `QueueManager` instance enables a lock request queuing system that operates according to the configured settings.
If `undefined` is specified, disable a lock request queuing system.
* The default value is the process-wide default queue manager (`QueueManager({ maxConcurrency: 5, maxPending: 500 })`).

#### Inherited from

`LockBaseConfig.queueManager`
