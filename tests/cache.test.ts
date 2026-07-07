import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Cache } from '../src/utils/cache';

describe('Cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and retrieves values', () => {
    const cache = new Cache<string>(600);
    cache.set('a', 'hello');
    expect(cache.get('a')).toBe('hello');
  });

  it('returns undefined for missing keys', () => {
    const cache = new Cache<string>();
    expect(cache.get('missing')).toBeUndefined();
  });

  it('expires entries after TTL', () => {
    const cache = new Cache<string>(10);
    cache.set('a', 'hello');
    expect(cache.get('a')).toBe('hello');
    vi.advanceTimersByTime(11_000);
    expect(cache.get('a')).toBeUndefined();
  });

  it('honors per-entry TTL override', () => {
    const cache = new Cache<string>(600);
    cache.set('a', 'hello', 5);
    vi.advanceTimersByTime(6_000);
    expect(cache.get('a')).toBeUndefined();
  });

  it('has() reflects expiry', () => {
    const cache = new Cache<number>(10);
    cache.set('n', 1);
    expect(cache.has('n')).toBe(true);
    vi.advanceTimersByTime(11_000);
    expect(cache.has('n')).toBe(false);
  });

  it('delete removes an entry', () => {
    const cache = new Cache<number>();
    cache.set('n', 1);
    cache.delete('n');
    expect(cache.get('n')).toBeUndefined();
  });

  it('clear empties the cache', () => {
    const cache = new Cache<number>();
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('purgeExpired drops only expired entries', () => {
    const cache = new Cache<number>(600);
    cache.set('keep', 1, 600);
    cache.set('drop', 2, 5);
    vi.advanceTimersByTime(6_000);
    cache.purgeExpired();
    expect(cache.get('keep')).toBe(1);
    expect(cache.get('drop')).toBeUndefined();
  });

  it('size purges expired entries before counting', () => {
    const cache = new Cache<number>(600);
    cache.set('a', 1, 5);
    cache.set('b', 2, 600);
    vi.advanceTimersByTime(6_000);
    expect(cache.size).toBe(1);
  });
});
