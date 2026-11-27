import { AsyncQueue, type QueueTask } from './Queue .ts'

/**
 * Queue manager configuration.
 */
interface Config {
  /**
   * The maximum number of lock requests that can be executed in parallel.
   * This is also the number of lock request `regular queues`. 
   * Default is XXX(実験中).　Min is 1.
   */
  maxConcurrency?: number;

  /**
   * The maximum number of all lock requests, including those currently being processed, 
   * for all queues managed by the QueueManager.
   * Default is XXX(実験中).　Min is 1.
   */
  maxPending?: number;
}

/**
 * Queue definition.
 */
export interface Queue {
  id: string;
  enqueue: <T>(task: QueueTask<T>, timerInfo: TimerInfo) => T | Promise<T>;
}

/** 
 * Queue timeout infomation.
 * 
 * The allowable duration for items to remain pending in the queue, 
 * and the error information to be returned if this limit is exceeded. 
 */
export interface TimerInfo {
  /** Timeout millisecconds. */
  timeout: number; 
  /** An error class instance to be thrown upon timeout.*/
  reason: unknown;
}

/**
 * A class that manages lock request queues. 
 * 
 * There are two types of queues: one or more `regular queues` and one or more `dedicated queues`. 
 * - `regular queues`:   These are called `regular queue(s)`. These are created and maintained based on 
 * the `maxConcurrency` setting passed to the constructor.
 * - `dedicated queues`: These are called `dedicated queue(s)`, and are created via `getDedicatedQueue()` 
 * whenever a specific (special) queue is required for a particular use case. 
 */
export class QueueManager {
  readonly #config: Required<Config>;
  readonly #dedicatedQueues = new Map<unknown, AsyncQueue<string>>();
  readonly #queues: AsyncQueue<string>[] = [];

  /** Get max pending. */
  public get maxConcurrency() { return this.#config.maxConcurrency };

  /** Get max concurrency. */
  public get maxPending() { return this.#config.maxPending };

  /** Get number of pending entries. */
  public get numberOfAllEntries() {
    return this.numberOfPending + this.numberOfRunning;
  }

  /** Get number of pending entries. */
  public get numberOfPending() {
    return this.#getNumberOfPending(this.#queues) 
    + this.#getNumberOfPending(this.#dedicatedQueues);
  }

  /** Get number of pending entries. */
  public get numberOfRunning() {
    return this.#getNumberOfRunning(this.#queues) 
    + this.#getNumberOfRunning(this.#dedicatedQueues);
  }

  /** Get number of all queues. */
  public get numberOfAllQueues() {
    return this.numberOfQueues + this.numberOfDedicatedQueues;
  }

  /** Get number of regular queues. */
  public get numberOfQueues() {
    return this.#queues.length;
  }

  /** Get number of dedicated queues. */
  public get numberOfDedicatedQueues() {
    return this.#dedicatedQueues.size;
  }

  /**
   * Constructor
   * @param config  Configurations.
   * - maxConcurrency: `number` The degree of parallelism for lock requests. A queue of this size is created and utilized.
   * - maxPending: `number`     The maximum number of pending lock requests.
   */
  public constructor(config: Config = { maxConcurrency: 5, maxPending: 500 }) {
    const conf = { ...config };
    if (conf.maxConcurrency == null) conf.maxConcurrency = 5;
    if (conf.maxPending == null) conf.maxPending = 500;
    conf.maxConcurrency = Math.max(conf.maxConcurrency, 1);
    conf.maxPending = Math.max(conf.maxPending, 1);
    this.#config = conf as Required<Config>;
    for(let i = 0; i < this.#config.maxConcurrency; i++)
      this.#queues.push(new AsyncQueue<string>(Math.random().toString(36).slice(2)));
  }

  /**
   * Add a task to the least busy queue.
   * @param task A lock request task—that is, a function that is called back when its turn arrives.
   * @param timerInfo Timeout information: the timeout duration and the error object to be thrown upon timeout.
   * @returns A promise that resolves to the return value of a `task`.
   */
  public async enqueue<T>(task: QueueTask<T>, timerInfo: TimerInfo): Promise<T> {
    return this.getCandidates()[0].enqueue<T>(task, timerInfo);
  }

  /** Get an array of enqueue functions, ordered by the number of entries (in ascending order). */
  public getCandidates(): Queue[] {
    const q = [...this.#queues];
    return q.sort((a, b) => a.numberOfEntries - b.numberOfEntries)
    .map(q => {
      return {
        id: q.id,
        enqueue: async <T>(task: QueueTask<T>, timerInfo: TimerInfo) => {
          return this.#enqueue<T>(q, task, timerInfo);
        }
      }
    });
  }

  /** 
   * Get a dedicated queue 
   * @param id  An identifier for a dedicated queue. It is recommended to use one that is uniquely linked to the lock key.
   * @returns A queue dedicated to a specific ID.
   */
  public getDedicatedQueue(id: string): Queue {
    let queue = this.#dedicatedQueues.get(id);
    if (!queue) {
      this.#dedicatedQueues.set(id, (queue = new AsyncQueue<string>(id)));
    }
    return {
      id: queue.id,
      enqueue: async <T>(task: QueueTask<T>, timerInfo: TimerInfo) => {
        return this.#enqueue(queue, task, timerInfo);
      }
    }
  }

  /** 
   * @internal
   * Add a task to the queue.
   */
  async #enqueue<T>(queue: AsyncQueue<string>, task: QueueTask<T>, timerInfo: TimerInfo): Promise<T> {
    if (this.numberOfPending >= this.#config.maxPending) {
      throw new QueueMaxPendingExceeded(this.#config.maxPending)
    }
    return queue.enqueue(task, timerInfo);
  }

  /**
   * @internal
   * Get number of pending entries in the queue.
   */
  #getNumberOfPending(q: AsyncQueue<string>[] | Map<unknown, AsyncQueue<string>>) {
    let ret = 0;
    q.forEach(q => { ret += q.numberOfPending });
    return ret;
  }

  #getNumberOfRunning(q: AsyncQueue<string>[] | Map<unknown, AsyncQueue<string>>) {
    let ret = 0;
    q.forEach(q => { ret += q.numberOfRunning });
    return ret;
  }
}

/** Max pending exceeded error. */
export class QueueMaxPendingExceeded extends Error {
  maxPending: number;
  constructor(maxPending: number) {
    super('The number of pending entries has reached the maximum limit.');
    this.maxPending = maxPending;
  }
}

export { type Config as QueueMgrConfig, type QueueTask };
