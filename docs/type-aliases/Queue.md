[**@ayapapa-npm/file-lock-js**](../api.md)

***

[@ayapapa-npm/file-lock-js](../api.md) / Queue

# Type Alias: Queue\<I\>

> **Queue**\<`I`\> = `object`

Defined in: [src/lib/QueueManager.ts:22](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/QueueManager.ts#L22)

Queue definition.

## Type Parameters

### I

`I`

## Properties

### enqueue

> **enqueue**: \<`T`\>(`task`, `timerInfo`) => `Promise`\<`T`\>

Defined in: [src/lib/QueueManager.ts:24](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/QueueManager.ts#L24)

#### Type Parameters

##### T

`T`

#### Parameters

##### task

[`QueueTask`](QueueTask.md)\<`T`\>

##### timerInfo

###### reason

`unknown`

###### timeout

`number`

#### Returns

`Promise`\<`T`\>

***

### id

> **id**: `I` \| `string`

Defined in: [src/lib/QueueManager.ts:23](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/QueueManager.ts#L23)
