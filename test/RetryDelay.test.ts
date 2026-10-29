import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type FileLockConfig, FileLock } from '../src/index.ts';
import { ExponentialDelay, FixedDelay, /*LinearDelay, */RetryDelay, retry, type DelayOptions } from '../src/lib/RetryDelay.ts';
//import { sleepAsync } from './FileLockTestCommon.ts';

let orgConfig: FileLockConfig;
beforeEach(() => {
  vi.restoreAllMocks();
  orgConfig = FileLock.getConfig();
});

afterEach(() => {
  vi.restoreAllMocks();
  FileLock.setConfig(orgConfig);
});

describe('RetryDelay', () => {

  class TestDelay extends RetryDelay {
    constructor(opts: DelayOptions) { super(opts) };
  }

  it("construct", () => {
    const delayT = new TestDelay({ base: 100 });
    expect(delayT.next()).toBe(100);
    //const delayL = new LinearDelay({ base: 100 });
    //expect(delayL.next()).toBe(100);
    const delayE = new ExponentialDelay({ base: 100 });
    expect(delayE.next()).toBe(100);
    const delayF = new FixedDelay({ base: 100 });
    expect(delayF.next()).toBe(100);
  });

  it("retry requires either a timeout or a retry count.", async () => {
    await expect(
      retry(() => 'result', () => false, {}, FixedDelay, { base: 0 })
    ).rejects.toThrow(TypeError);
  });

  it("retry accepts zero retries and makes only the initial attempt.", async () => {
    const fn = vi.fn(() => 'result');

    await expect(
      retry(fn, () => true, { retries: 0 }, FixedDelay, { base: 0 })
    ).resolves.toBe('result');
    expect(fn).toHaveBeenCalledOnce();
  });

  it("retry rejects a delay class that does not directly extend RetryDelay.", async () => {
    class ExtendedFixedDelay extends FixedDelay {}

    await expect(
      retry(() => 'result', () => false, { retries: 0 }, ExtendedFixedDelay, { base: 0 })
    ).rejects.toThrow(TypeError);
  });
/*
  it("LinearDelay", () => {
    const delay = new LinearDelay({ base: 100, max: 1000, factor: 1, jitterRatio: 0});
    expect(delay.next()).toBe(100);
    expect(delay.next()).toBe(200);
    delay.next(); delay.next(); delay.next();
    expect(delay.next()).toBe(600);
    delay.next(); delay.next(); delay.next();
    expect(delay.next()).toBe(1000);
    delay.next(); delay.next(); delay.next();
    expect(delay.next()).toBe(1000);
  });

  it("LinearDelay/general", () => {
    const base = 150;
    const max = 2000;
    const factor = 2;
    const jitterRatio = 0.2;
    const jitterMin = 1 - jitterRatio;
    const jitterMax = 1 + jitterRatio;
    const delay = new LinearDelay({ base, max, factor, jitterRatio});
    for(let i = 0; i < 20; i++) {
      const d = delay.next();
      const capped = Math.min(max, base * factor * (i + 1));
      expect(d).toBeGreaterThanOrEqual(Math.round(capped * jitterMin));
      expect(d).toBeLessThanOrEqual(Math.round(capped * jitterMax));
    }
  });
  */
  it("ExponentialDelay", () => {
    const delay = new ExponentialDelay({ base: 100, max: 1000, factor: 1, jitterRatio: 0});
    expect(delay.next()).toBe(100);
    expect(delay.next()).toBe(100);
    delay.next(); delay.next(); delay.next();
    expect(delay.next()).toBe(100);
    delay.next(); delay.next(); delay.next();
    expect(delay.next()).toBe(100);
    delay.next(); delay.next(); delay.next();
    expect(delay.next()).toBe(100);
  });

  it("ExponentialDelay/factor2", () => {
    const delay = new ExponentialDelay({ base: 100, max: 1000, factor: 2, jitterRatio: 0});
    expect(delay.next()).toBe(100);
    expect(delay.next()).toBe(200);
    expect(delay.next()).toBe(400);
    expect(delay.next()).toBe(800);
    expect(delay.next()).toBe(1000);
    expect(delay.next()).toBe(1000);
    expect(delay.next()).toBe(1000);
  });

  it("ExponentialDelay/general", () => {
    const base = 100;
    const max = 2000;
    const factor = 2;
    const jitterRatio = 0.25;
    const jitterMin = 1 - jitterRatio;
    const jitterMax = 1 + jitterRatio;
    const delay = new ExponentialDelay({ base, max, factor, jitterRatio});
    for(let i = 0; i < 20; i++) {
      const d = delay.next();
      const capped = Math.min(max, base * factor ** i);
      expect(d).toBeGreaterThanOrEqual(Math.round(capped * jitterMin));
      expect(d).toBeLessThanOrEqual(Math.round(capped * jitterMax));
    }
  });

  it("FixedDelay", () => {
    const delay = new FixedDelay({ base: 100, max: 1000, factor: 1, jitterRatio: 0});
    expect(delay.next()).toBe(100);
    expect(delay.next()).toBe(100);
    delay.next(); delay.next(); delay.next();
    expect(delay.next()).toBe(100);
    delay.next(); delay.next(); delay.next();
    expect(delay.next()).toBe(100);
    delay.next(); delay.next(); delay.next();
    expect(delay.next()).toBe(100);
  });

  it("FixedDelay/max200/factor2", () => {
    const delay = new FixedDelay({ base: 100, max: 200, factor: 2, jitterRatio: 0});
    expect(delay.next()).toBe(200);
    expect(delay.next()).toBe(200);
    delay.next(); delay.next(); delay.next();
    expect(delay.next()).toBe(200);
    delay.next(); delay.next(); delay.next();
    expect(delay.next()).toBe(200);
    delay.next(); delay.next(); delay.next();
    expect(delay.next()).toBe(200);
  });

  it("FixedDelay/general", () => {
    const base = 100;
    const max = 1000;
    const factor = 1;
    const jitterRatio = 0.2;
    const jitterMin = 1 - jitterRatio;
    const jitterMax = 1 + jitterRatio;
    const delay = new FixedDelay({ base, max, factor, jitterRatio});
    for(let i = 0; i < 20; i++) {
      const d = delay.next();
      const capped = Math.min(max, base * factor);
      expect(d).toBeGreaterThanOrEqual(Math.round(capped * jitterMin));
      expect(d).toBeLessThanOrEqual(Math.round(capped * jitterMax));
    }
  });
/*
  it("ExponentialDelay/実験君", async () => {
    const base = 100;
    const max = 1000;
    const factor = 1.2;
    const jitterRatio = 0.2;
    const jitterMin = 1 - jitterRatio;
    const jitterMax = 1 + jitterRatio;
    const delay = new ExponentialDelay({ base, max, factor, jitterRatio});

    const timeout = Date.now() + 5000;
    for(let i = 0; Date.now() < timeout; i++) {
      const d = delay.next();
      const capped = Math.min(max, base * Math.max(1, factor) ** i);
      console.log("delay:", d, "no jitter:", capped, "jitterRatio:", Math.abs((d - capped) / capped) );
      expect(d).toBeGreaterThanOrEqual(Math.round(capped * jitterMin));
      expect(d).toBeLessThanOrEqual(Math.round(capped * jitterMax));
      await sleepAsync(d);
    }
  });
*/
});
