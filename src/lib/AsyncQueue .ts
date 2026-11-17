/** Task definition to be registered in a queue. */
export type QueueTask<T> = () => Promise<T>;

/** Data structure to be added to a queue. */
interface QueueItem<T> {
    /** The task to be executed (asynchronous operation). */
    task: QueueTask<T>;
    /** Resolve the Promise upon successful processing. */
    resolve: (value: T) => void;
    /**Reject the Promise if the operation fails. */
    reject: (reason: unknown) => void;
    /** Time of registration to the queue. */
    enqueuedAt: number;
		/** timeout timer */
		timer: NodeJS.Timeout;
}

/** Asynchronous task queue. */
export class AsyncQueue {
	readonly #queue: QueueItem<unknown>[] = [];
	#running = false;
	readonly #id: string | number;

	public constructor(id: string | number) {
		this.#id = id;
	}

	/** 
	 * Add a task to the queue. 
	 * Added tasks are executed sequentially.
	 * @param task Task to add to the queue.
	 * @param timerInfo Information on the maximum wait time for tasks.
	 */
	public async enqueue<T>(task: QueueTask<T>, timerInfo: { timeout: number, reason: unknown }): Promise<T> {
		const start = Date.now();
		return new Promise<T>((resolve, reject) => {
			const item = {
				task,
				resolve: resolve as (value: unknown) => void,
				reject,
				enqueuedAt: start,
				timer: setTimeout(() => {
					const index = this.#queue.indexOf(item);
					(index !== -1) &&	this.#queue.splice(index, 1);
					reject(timerInfo.reason);
				}, timerInfo.timeout),
			}
			this.#push(item);
			void this.#processNext();
		});
	}

	/** Id of this queue. */
	public get id(): string | number { return this.#id; }

	/** Queue size, including tasks currently being executed. */
	public get size(): number { 
		return this.#running 
		? this.#queue.length + 1 
		: this.#queue.length;
	}

	/**
	 * @internal 
	 * Execute the following task. 
	 */
	async #processNext(): Promise<void> {
		if (this.#running) return;
		const item = this.#queue.shift();
		if (!item) return;

		this.#running = true;

		try {
			item.timer != null && clearTimeout(item.timer);
			const result = await item.task();
			item.resolve(result);
		} catch (error) {
			item.reject(error);
		} finally {
			this.#running = false;
			void this.#processNext();
		}
	}

	/**
	 * @internal
	 * @param item	An item to be queued. 
	 */
	#push(item: QueueItem<unknown>): void {
		this.#queue.push(item);
	}
}