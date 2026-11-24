[**@ayapapa-npm/file-lock-js**](../api.md)

***

[@ayapapa-npm/file-lock-js](../api.md) / QueueMgrConfig

# Interface: QueueMgrConfig

Defined in: [src/lib/QueueManager.ts:3](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/QueueManager.ts#L3)

## Properties

### maxConcurrency?

> `optional` **maxConcurrency?**: `number`

Defined in: [src/lib/QueueManager.ts:9](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/QueueManager.ts#L9)

The maximum number of lock requests that can be executed in parallel.
This is also the number of lock request `regular queues`. 
Default is XXX(実験中).　Min is 1.

***

### maxPending?

> `optional` **maxPending?**: `number`

Defined in: [src/lib/QueueManager.ts:16](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/QueueManager.ts#L16)

The maximum number of all lock requests, including those currently being processed, 
for all queues managed by the QueueManager.
Default is XXX(実験中).　Min is 1.
