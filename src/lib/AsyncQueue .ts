/** Queueに登録するタスク */
export type QueueTask<T> = () => Promise<T>;

/** Queueに登録するデータ構造 */
interface QueueItem<T> {
    /** 実際に実行するタスク（非同期処理） */
    task: QueueTask<T>;
    /** 処理成功時にPromiseを完了させる */
    resolve: (value: T) => void;
    /** 処理失敗時にPromiseを拒否する */
    reject: (reason: unknown) => void;
    /** Queueへの登録時刻 */
    enqueuedAt: number;
		/** timeout timer */
		timer: NodeJS.Timeout;
}

/** 非同期タスクキュー */
export class AsyncQueue {
	#queue: QueueItem<unknown>[] = [];
	#running = false;
	readonly #id: string | number;

	public constructor(id: string | number) {
		this.#id = id;
	}

	/** 
	 * キューにタスクを追加する
	 * 追加されたタスクは、順次実行される。
	 * @param task キューに追加するタスク。
	 * @param timerInfo 
	 */
	public async enqueue<T>(task: QueueTask<T>, timerInfo: { timeout: number, reason: unknown }): Promise<T> {
		console.log("enqueue");
		const start = Date.now();
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
					reject(timerInfo.reason);
				}, timerInfo.timeout),
			}
			this.#push(item);
			this.#processNext();
		});
	}

	public get id(): string | number { return this.#id; }

	public get size(): number { 
		return this.#running 
		? this.#queue.length + 1 
		: this.#queue.length;
	}

	async #processNext(): Promise<void> {
		if (this.#running) return;

		console.log("processNext");

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
			this.#processNext();
		}
	}

	#max: number = 0;

	#push(item: QueueItem<unknown>) {
		this.#queue.push(item);
		// for debug
		if (this.#max < this.size) {
			this.#max = this.size;
			console.log("AsyncQueue's id =", this.#id, "size =", this.#max)
		}
	}
}