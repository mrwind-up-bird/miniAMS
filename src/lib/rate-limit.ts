/**
 * Simple in-memory sliding-window rate limiter.
 * Each key (typically IP or userId) is allowed `limit` requests within `windowMs`.
 */

interface RateLimitEntry {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function startCleanup(windowMs: number) {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs)
      if (entry.timestamps.length === 0) {
        store.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
  // Allow Node.js to exit even with the timer running
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref()
  }
}

interface RateLimitOptions {
  /** Maximum requests allowed in the window. Default: 60 */
  limit?: number
  /** Time window in milliseconds. Default: 60000 (1 minute) */
  windowMs?: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetMs: number
}

export function rateLimit(
  key: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const { limit = 60, windowMs = 60_000 } = options

  startCleanup(windowMs)

  const now = Date.now()
  let entry = store.get(key)

  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs)

  if (entry.timestamps.length >= limit) {
    const oldestInWindow = entry.timestamps[0]
    const resetMs = oldestInWindow + windowMs - now
    return { allowed: false, remaining: 0, resetMs }
  }

  entry.timestamps.push(now)
  return {
    allowed: true,
    remaining: limit - entry.timestamps.length,
    resetMs: windowMs,
  }
}
