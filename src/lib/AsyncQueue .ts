import { AlreadyLocked } from './LockBaseErrors.ts';

/** Queueに登録するデータ構造 */
interface QueueItem<T> {
    /** 実際に実行するタスク（非同期処理） */
    task: () => Promise<T>;
    /** 処理成功時にPromiseを完了させる */
    resolve: (value: T) => void;
    /** 処理失敗時にPromiseを拒否する */
    reject: (reason: unknown) => void;
    /** Queueへの登録時刻 */
    enqueuedAt: number;
		/** timeout timer */
		timer: NodeJS.Timeout;
}

/** Queueに登録するタスク */
type QueueTask<T> = () => Promise<T>;

/** 非同期タスクキュー */
export class AsyncQueue {
    #queue: QueueItem<unknown>[] = [];
    #running = false;
		readonly #key: string;

		public constructor(key: string) {
			this.#key = key;
		}

    /** 
     * キューにタスクを追加する
     * 追加されたタスクは、順次実行される。
     */
    public async enqueue<T>(task: QueueTask<T>, timeoutMs: number): Promise<T> {
			const start = Date.now();
			//const timer = this.#createTimer(timeoutMs);
			return new Promise<T>((resolve, reject) => {
				const item = {
							task,
							resolve: resolve as (value: unknown) => void,
							reject,
							enqueuedAt: start,
							timer: setTimeout(() => {
								const index = this.#queue.indexOf(item);
								if (index !== -1) {
										this.#queue.splice(index, 1);
								}
								reject(new AlreadyLocked('The `lock file` already exists.', {
									timeoutMs, key: this.#key, props: { reason: 'ExistingLock' } 
								}));
							}, timeoutMs),
				}
				this.#queue.push(item);
				this.#processNext();
			});
			/*
			return Promise.race([taskPr, timer.promise as Promise<T>])
				.finally(() => { // In any case, turn off the timer.
					clearTimeout(timer.id!);
				});
				*/
    }

    async #processNext(): Promise<void> {
			if (this.#running) return;

			const item = this.#queue.shift();
			if (!item) return;

			this.#running = true;

			try {
				clearTimeout(item.timer);
				const result = await item.task();
				item.resolve(result);
			} catch (error) {
				item.reject(error);
			} finally {
				this.#running = false;
				this.#processNext();
			}
    }
  /**
   * @internal
   * Create a timer for TTL.
   * @param options Lock options.
   */
	/*
  #createTimer(timeoutMs: number): { id: NodeJS.Timeout | null, promise: Promise<unknown> } {
    let id: NodeJS.Timeout | null = null;
    const promise = new Promise((_, reject) => {
      id = setTimeout(() => {
        reject(new AlreadyLocked('The `lock file` already exists.', {
					timeoutMs, key: this.#key, props: { reason: 'ExistingLock' } 
				}));
      },
      timeoutMs);
    });
    return { id, promise };
  }
	*/

}