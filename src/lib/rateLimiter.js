// src/lib/rateLimiter.js
// Simple in-memory sliding window (per server instance)
// For Vercel, this resets on cold starts—good enough for small/public beta.

const buckets = new Map(); // key -> { hits: number[], lastPruned: number }

export function rateLimit({ key, limit = 30, windowMs = 60_000 }) {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [], lastPruned: now };

  // prune old timestamps
  const cutoff = now - windowMs;
  bucket.hits = bucket.hits.filter(ts => ts > cutoff);
  bucket.hits.push(now);

  buckets.set(key, bucket);

  const remaining = Math.max(0, limit - bucket.hits.length);
  const ok = bucket.hits.length <= limit;

  return {
    ok,
    remaining,
    limit,
    resetMs: windowMs - (now - (bucket.hits[0] ?? now)),
  };
}

// Helper: extract IP from Next/Vercel request
export function getClientIp(req) {
  try {
    const hdr = req.headers.get('x-forwarded-for') || '';
    return hdr.split(',')[0].trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}
