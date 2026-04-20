/**
 * Tiered in-memory rate limiter for AI API routes.
 *
 * Tracks usage per IP address with a daily reset.
 * Supports multiple tiers:
 *   - Free (no auth): 3 AI actions/day
 *   - Pro ($24/month): 30 AI actions/day
 *   - Premium ($39/month): unlimited
 *
 * This keeps API costs predictable while still letting
 * free users experience enough value to convert.
 *
 * For production at scale, swap this for Redis-backed
 * rate limiting (e.g., @upstash/ratelimit).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // timestamp when the limit resets
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 10 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Max number of AI actions allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds (default: 24 hours) */
  windowMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

const DEFAULT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if a request is within the rate limit.
 *
 * @param identifier - Usually the client IP address
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed, plus metadata
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const windowMs = config.windowMs ?? DEFAULT_WINDOW;
  const entry = store.get(identifier);

  // First request or window has expired — reset
  if (!entry || now > entry.resetAt) {
    store.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  // Within window — check limit
  if (entry.count < config.maxRequests) {
    entry.count++;
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  // Over limit
  return {
    allowed: false,
    remaining: 0,
    resetAt: entry.resetAt,
  };
}

/**
 * Extract client IP from a Next.js request.
 * Checks common proxy headers, falls back to 'unknown'.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

/** Tier definitions — adjust limits here */
export type UserTier = 'free' | 'pro' | 'premium';

const TIER_LIMITS: Record<UserTier, number> = {
  free: 3,      // 3 AI actions/day — enough for one full workflow
  pro: 30,      // 30 AI actions/day — generous for $24/month
  premium: 9999, // effectively unlimited for $39/month
};

/**
 * Determine the user's tier from the request.
 *
 * Right now this checks a simple header/cookie. When you add
 * Stripe + auth, replace this with a real user lookup.
 * For now, everyone is "free" unless they have a tier cookie.
 */
function getUserTier(req: Request): UserTier {
  // Check for tier cookie (set after Stripe checkout / login)
  const cookieHeader = req.headers.get('cookie') || '';
  const tierMatch = cookieHeader.match(/jobpilot_tier=(free|pro|premium)/);
  if (tierMatch) {
    return tierMatch[1] as UserTier;
  }

  // Check for auth header (for API/testing)
  const tierHeader = req.headers.get('x-jobpilot-tier');
  if (tierHeader && tierHeader in TIER_LIMITS) {
    return tierHeader as UserTier;
  }

  return 'free';
}

/**
 * Convenience: check rate limit and return a 429 Response if exceeded.
 * Returns null if the request is allowed.
 * Automatically detects the user's tier and applies the right limit.
 */
export function rateLimitResponse(
  req: Request,
  config?: RateLimitConfig
): Response | null {
  const tier = getUserTier(req);
  const maxRequests = config?.maxRequests ?? TIER_LIMITS[tier];

  const ip = getClientIp(req);
  // Use tier in the key so upgrading immediately grants more actions
  const identifier = `${ip}:${tier}`;
  const result = checkRateLimit(identifier, { maxRequests, windowMs: config?.windowMs });

  if (!result.allowed) {
    const resetDate = new Date(result.resetAt);
    const upgradeHint = tier === 'free'
      ? ' Upgrade to Pro for 30 AI actions/day.'
      : tier === 'pro'
        ? ' Upgrade to Premium for unlimited actions.'
        : '';

    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `You've used all ${maxRequests} AI actions for today.${upgradeHint} Resets at ${resetDate.toISOString()}.`,
        tier,
        resetAt: result.resetAt,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetAt),
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  return null;
}
