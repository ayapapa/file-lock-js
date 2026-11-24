[**@ayapapa-npm/file-lock-js**](../api.md)

***

[@ayapapa-npm/file-lock-js](../api.md) / QueueManager

# Class: QueueManager\<DQID\>

Defined in: [src/lib/QueueManager.ts:39](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/QueueManager.ts#L39)

A class that manages lock request queues. 

There are two types of queues: one or more `regular queues` and one or more `dedicated queues`. 
- `regular queues`:   These are called `regular queue(s)`. These are created and maintained based on 
the `maxConcurrency` setting passed to the constructor.
- `dedicated queues`: These are called `dedicated queue(s)`, and are created via `getDedicatedQueue()` 
whenever a specific (special) queue is required for a particular use case.

## Type Parameters

### DQID

`DQID` = `unknown`

キューに格納する項目の型。

## Constructors

### Constructor

> **new QueueManager**\<`DQID`\>(`config?`): `QueueManager`\<`DQID`\>

Defined in: [src/lib/QueueManager.ts:66](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/QueueManager.ts#L66)

Constructor

#### Parameters

##### config?

[`QueueMgrConfig`](../interfaces/QueueMgrConfig.md) = `...`

#### Returns

`QueueManager`\<`DQID`\>

## Accessors

### numberOfAllQueues

#### Get Signature

> **get** **numberOfAllQueues**(): `number`

Defined in: [src/lib/QueueManager.ts:51](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/QueueManager.ts#L51)

Get number of all queues.

##### Returns

`number`

***

### numberOfDedicatedQueues

#### Get Signature

> **get** **numberOfDedicatedQueues**(): `number`

Defined in: [src/lib/QueueManager.ts:61](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/QueueManager.ts#L61)

Get number of dedicated queues.

##### Returns

`number`

***

### numberOfPending

#### Get Signature

> **get** **numberOfPending**(): `number`

Defined in: [src/lib/QueueManager.ts:45](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/QueueManager.ts#L45)

Get number of pending entries.

##### Returns

`number`

***

### numberOfQueues

#### Get Signature

> **get** **numberOfQueues**(): `number`

Defined in: [src/lib/QueueManager.ts:56](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/QueueManager.ts#L56)

Get number of regular queues.

##### Returns

`number`

## Methods

### getCandidates()

> **getCandidates**(): [`Queue`](../type-aliases/Queue.md)\<`DQID`\>[]

Defined in: [src/lib/QueueManager.ts:78](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/QueueManager.ts#L78)

Get an array of enqueue functions, ordered by the number of entries (in ascending order).

#### Returns

[`Queue`](../type-aliases/Queue.md)\<`DQID`\>[]

***

### getDedicatedQueue()

> **getDedicatedQueue**(`key`): [`Queue`](../type-aliases/Queue.md)\<`DQID`\>

Defined in: [src/lib/QueueManager.ts:92](https://github.com/ayapapa/file-lock-js/blob/87736ff46f2aa40d20ed6dacac3b8eebf19ba03e/src/lib/QueueManager.ts#L92)

Get a dedicated queue

#### Parameters

##### key

`DQID`

#### Returns

[`Queue`](../type-aliases/Queue.md)\<`DQID`\>
