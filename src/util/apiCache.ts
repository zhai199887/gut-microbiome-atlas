/**
 * apiCache.ts — Simple in-memory API response cache
 * 简易内存API响应缓存，避免重复请求
 */

const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch with caching: returns cached response if available and not expired.
 * 带缓存的 fetch：如果缓存可用且未过期则直接返回
 */
export async function cachedFetch<T>(url: string): Promise<T> {
  const now = Date.now();
  const entry = cache.get(url);
  if (entry && now - entry.ts < TTL) {
    return entry.data as T;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  cache.set(url, { data, ts: now });

  // Evict old entries if cache grows too large
  if (cache.size > 100) {
    const oldest = [...cache.entries()]
      .sort((a, b) => a[1].ts - b[1].ts)
      .slice(0, 20);
    for (const [key] of oldest) cache.delete(key);
  }

  return data as T;
}

/** Clear all cached entries / 清空所有缓存 */
export function clearApiCache() {
  cache.clear();
}
