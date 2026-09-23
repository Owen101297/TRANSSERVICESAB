interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, RateLimitEntry>();

export function consumeRateLimit(
  key: string,
  limit = 10,
  windowMs = 15 * 60 * 1000
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  current.count += 1;
  if (current.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function clearRateLimit(key: string): void {
  attempts.delete(key);
}
