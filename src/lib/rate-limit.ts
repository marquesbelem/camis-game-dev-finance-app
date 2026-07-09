import { NextRequest } from "next/server";

interface RateLimitTracker {
  count: number;
  resetTime: number;
}

// In-memory store (wiped when server/worker restarts)
const rateLimitStore = new Map<string, RateLimitTracker>();

export interface RateLimitOptions {
  windowMs: number; // Time window size in milliseconds
  max: number;      // Max request count per windowMs
}

/**
 * Checks if a request rate limit is exceeded for a given key.
 * Returns true if rate limited, false if allowed.
 */
export function isRateLimited(key: string, options: RateLimitOptions): boolean {
  const now = Date.now();
  const tracker = rateLimitStore.get(key);

  if (!tracker) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + options.windowMs,
    });
    return false;
  }

  // If time window has expired, reset count and timeline
  if (now > tracker.resetTime) {
    tracker.count = 1;
    tracker.resetTime = now + options.windowMs;
    return false;
  }

  tracker.count += 1;
  if (tracker.count > options.max) {
    return true;
  }

  return false;
}

/**
 * Gets the client IP address from request headers or environment.
 */
export function getClientIp(request: NextRequest): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  return "127.0.0.1";
}
