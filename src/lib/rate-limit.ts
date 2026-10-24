// ---------------------------------------------------------------------------
// Simple in-memory rate limiter (per-IP, sliding window).
// Suitable for a single-node store; swap for Redis/Upstash when scaling.
// NOTE: limits are deliberately generous because many students in Malete share
// a small number of NAT/campus IPs — one IP ≠ one person.
// ---------------------------------------------------------------------------

interface Bucket {
  timestamps: number[]
}

const buckets = new Map<string, Bucket>()

// Periodic cleanup so the map never grows unbounded
let lastSweep = Date.now()
function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < 30 * 60_000)
    if (bucket.timestamps.length === 0) buckets.delete(key)
  }
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterSeconds: number
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now)
  const bucket = buckets.get(key) ?? { timestamps: [] }
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs)
  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0]
    buckets.set(key, bucket)
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil((oldest + windowMs - now) / 1000) }
  }
  bucket.timestamps.push(now)
  buckets.set(key, bucket)
  return { ok: true, remaining: limit - bucket.timestamps.length, retryAfterSeconds: 0 }
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'local'
}
