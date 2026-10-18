
/**
 * @intenal
 * Definition of cache entry.
 */
type Entry<V> = {
  value: V;
  expiresAt: number;
};

/**
 * @internal
 * Cache.
 */
export class Cache<K, V> {
  /**
   * Instans fields.
   */

  /**
   * Number of etries.
   */
  public get size () {
    return this.#cache.size;
  }

  /**
   * Maximum number of entries.
   */
  readonly #max: number;

  /**
   * TTL(milliseconds) of `cache entry`.
   */
  readonly #ttlMs: number;

  /**
   *  Cache database.
   */
  readonly #cache = new Map<K, Entry<V>>();

  /**
   * Constructor
   * @param config   Configurations. <br>
   * - max: `number` type - Maximum number of entries. Default is `100`.
   * - ttlMs: `number` type - TTL(milliseconds) of `cache entry`. Default is `10000`.
   */
  public constructor(config?: { max?: number, ttlMs?: number }) {
    this.#max = config?.max ?? 100;
    if (!Number.isSafeInteger(this.#max) || this.#max < 1) {
      throw new RangeError("`max` must be a positive safe integer.");
    }
    this.#ttlMs = config?.ttlMs ?? 10000;
    if (!Number.isFinite(this.#ttlMs) || this.#ttlMs <= 0) {
      throw new RangeError("`ttlMs` must be greater than zero.");
    }
  }

  /**
   * Clear all caches.
   */
  public clear(): void {
    this.#cache.clear();
  }

  /**
   * Execute a callback function for each element.
   * @param callbackFn Callback function
   */
  public forEach(callbackFn: (value: V, key: K) => void) {
    this.#cache.forEach((entry: Entry<V>, key: K, _map: Map<K, Entry<V>>) => callbackFn(entry.value, key));
  }

  /**
   * Get the `value` corresponding to the `key`. 
   * @param key Key.
   * @returns Value.
   */
  public get(key: K): V | undefined {
    const entry = this.#cache.get(key);

//    if (entry === undefined) return undefined;

    if (entry && entry.expiresAt <= Date.now()) {
      this.#cache.delete(key);
      return undefined;
    }

    return entry?.value;
  }

  /**
   * 
   * @param key Key.
   * @returns 'true' if a value corresponding exists. 
   * Note that no validation of the value is performed; therefore, 
   * the method will return `true` as long as the value exists, even if it has expired.
   */
  public has(key: K): boolean {
    return this.#cache.has(key);
  }

  /**
   * Put the `value` with the `key`. 
   * @param key Key.
   * @param value Value corresponding to the `key`.
   */
  public set(key: K, value: V): void {
    const now = Date.now();

    // Delete expired entries
    for (const [k, entry] of this.#cache) {
      entry.expiresAt <= now && this.#cache.delete(k);
    }

    // Updates to existing keys are treated as new registrations.
    this.#cache.delete(key);

    // If the limit is exceeded, the oldest entry is deleted.
    while (this.#cache.size >= this.#max) {
      const oldest = this.#cache.keys().next();
      oldest.value && this.#cache.delete(oldest.value);
    }

    // Set a key-value pair in the database.
    this.#cache.set(key, {
      value,
      expiresAt: now + this.#ttlMs,
    });

  }

}

