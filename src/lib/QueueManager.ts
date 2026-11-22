import { PendingLocksExceeded } from './LockBaseErrors.ts';
import { AsyncQueue, type QueueTask } from './Queue .ts'

export interface Config {
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

export type Queue<I> = {
  id: I | string,
  enqueue: <T>(task: QueueTask<T>, timerInfo: { timeout: number, reason: unknown }) => Promise<T>,
}

/**
 * A class that manages lock request queues. 
 * 
 * There are two types of queues: one or more `regular queues` and one or more `dedicated queues`. 
 * - `regular queues`:   These are called `regular queue(s)`. These are created and maintained based on 
 * the `maxConcurrency` setting passed to the constructor.
 * - `dedicated queues`: These are called `dedicated queue(s)`, and are created via `getDedicatedQueue()` 
 * whenever a specific (special) queue is required for a particular use case. 
 * 
 *
 * @template DQID - キューに格納する項目の型。
 */
export class QueueManager<DQID = unknown> {
  readonly #config: Required<Config>;
  readonly #dedicatedQueues = new Map<unknown, AsyncQueue<DQID | string>>();
  readonly #queues: AsyncQueue<DQID | string>[] = [];

  public get totalSize() {
    return this.size + this.dedicatedQueuesSize;
  }

  public get size() {
    return this.#getSize(this.#queues);
  }

  public get dedicatedQueuesSize() {
    return this.#getSize(this.#dedicatedQueues);
  }

  public get numberOfTotalQueues() {
    return this.numberOfQueues + this.numberOfDedicatedQueues;
  }

  public get numberOfQueues() {
    return this.#queues.length;
  }

  public get numberOfDedicatedQueues() {
    return this.#dedicatedQueues.size;
  }

  public constructor(config: Config = { maxConcurrency: 5, maxPending: 500 }) {
    const conf = { ...config };
    if (!conf.maxConcurrency) conf.maxConcurrency = 5;
    if (!conf.maxPending) conf.maxPending = 500;
    conf.maxConcurrency = Math.max(conf.maxConcurrency, 1);
    conf.maxPending = Math.max(conf.maxPending, 1);
    this.#config = conf as Required<Config>;
    for(let i = 0; i < this.#config.maxConcurrency; i++)
      this.#queues.push(new AsyncQueue<DQID | string>(Math.random().toString(36).slice(2)));
  }

  /** Get an array of enqueue functions, ordered by the number of entries (in ascending order). */
  public getCandidates(): Queue<DQID>[] {
    const q = [...this.#queues];
    return q.sort((a, b) => a.size - b.size)
    .map(q => {
      return {
        id: q.id,
        enqueue: async <T>(task: QueueTask<T>, timerInfo: { timeout: number, reason: unknown }) => {
          return this.#enqueue(q, task, timerInfo);
        }
      }
    });
  }

  /** Get a dedicated queue */
  public getDedicatedQueue(key: DQID): Queue<DQID> {
    let queue = this.#dedicatedQueues.get(key);
    if (!queue) {
      this.#dedicatedQueues.set(key, (queue = new AsyncQueue<DQID | string>(key)));
    }
    return {
      id: queue.id,
      enqueue: async <T>(task: QueueTask<T>, timerInfo: { timeout: number, reason: unknown }) => {
        return this.#enqueue(queue, task, timerInfo);
      }
    }
  }

  async #enqueue<T>(queue: AsyncQueue<DQID | string>, task: QueueTask<T>, timerInfo: { timeout: number, reason: unknown }): Promise<T> {
    if (this.totalSize >= this.#config.maxPending) {
      throw new PendingLocksExceeded(undefined, { maxPending: this.#config.maxPending })
    }
    return queue.enqueue(task, timerInfo);
  }

  #getSize(q: AsyncQueue<DQID | string>[] | Map<unknown, AsyncQueue<DQID | string>>) {
    let ret = 0;
    q.forEach(q => { ret += q.size });
    return ret;
  }

}

export { AsyncQueue, type Config as QueueMgrConfig };
