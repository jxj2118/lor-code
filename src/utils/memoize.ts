import {LRUCache} from "lru-cache";

type LRUMemoizedFunction<Args extends unknown[], Result> = {
    (...args: Args): Result
    cache: {
        clear: () => void
        size: () => number
        delete: (key: string) => boolean
        get: (key: string) => Result | undefined
        has: (key: string) => boolean
    }
}
/**
 * Creates a memoized function with LRU (Least Recently Used) eviction policy.
 * This prevents unbounded memory growth by evicting the least recently used entries
 * when the cache reaches its maximum size.
 *
 * Note: Cache size for memoized message processing functions
 * Chosen to prevent unbounded memory growth (was 300MB+ with lodash memoize)
 * while maintaining good cache hit rates for typical conversations.
 *
 * @param f The function to memoize
 * @returns A memoized version of the function with cache management methods
 */
export function memoizeWithLRU<
    Args extends unknown[],
    Result extends NonNullable<unknown>,
>(
    f: (...args: Args) => Result,
    cacheFn: (...args: Args) => string,
    maxCacheSize: number = 100,
): LRUMemoizedFunction<Args, Result> {
    const cache = new LRUCache<string, Result>({
        max: maxCacheSize,
    })

    const memoized = (...args: Args): Result => {
        const key = cacheFn(...args)
        const cached = cache.get(key)
        if (cached !== undefined) {
            return cached
        }

        const result = f(...args)
        cache.set(key, result)
        return result
    }

    // Add cache management methods
    memoized.cache = {
        clear: () => cache.clear(),
        size: () => cache.size,
        delete: (key: string) => cache.delete(key),
        // peek() avoids updating recency — we only want to observe, not promote
        get: (key: string) => cache.peek(key),
        has: (key: string) => cache.has(key),
    }

    return memoized
}
