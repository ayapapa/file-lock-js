[**@ayapapa-npm/file-lock-js**](../api.md)

***

[@ayapapa-npm/file-lock-js](../api.md) / FileLock

# Variable: FileLock

> `const` **FileLock**: [`FileLockInterface`](../interfaces/FileLockInterface.md)

Defined in: [src/lib/FileLock.ts:62](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/FileLock.ts#L62)

A global file-lock object. 
As long as this object is used, it will be shared across any instances, provided they belong to the same process.
