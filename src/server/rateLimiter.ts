import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const windowMs = 60 * 1000; // 1 minute
const maxRequestsPerWindow = 120; // 120 requests per minute
const hits = new Map<string, RateLimitRecord>();

// Clean up stale records every 2 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of hits.entries()) {
    if (now > record.resetTime) {
      hits.delete(key);
    }
  }
}, 2 * 60 * 1000);
cleanupInterval.unref();

export function apiRateLimiter(req: Request, res: Response, next: NextFunction) {
  // Use user id or fallback to IP
  const identifier =
    (req.headers['x-user-id'] as string) ||
    req.ip ||
    req.socket.remoteAddress ||
    'anonymous';

  const now = Date.now();
  const record = hits.get(identifier);

  if (!record || now > record.resetTime) {
    hits.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return next();
  }

  if (record.count >= maxRequestsPerWindow) {
    const retrySec = Math.ceil((record.resetTime - now) / 1000);
    res.setHeader('Retry-After', retrySec);
    return res.status(429).json({
      error: 'Too many requests. Please wait before trying again.',
      retryAfterSeconds: retrySec,
    });
  }

  record.count += 1;
  next();
}
