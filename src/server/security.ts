import crypto from 'node:crypto';
import type { CookieOptions, NextFunction, Request, Response } from 'express';

export const SESSION_COOKIE_NAME = 'edison_proto_session';
export const CSRF_COOKIE_NAME = 'edison_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

export function generateCsrfToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function timingSafeMatch(expected: string | undefined, actual: string | undefined): boolean {
  if (!expected || !actual) return false;
  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(actual, 'utf8');
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      result[key] = decodeURIComponent(val);
    } catch {
      result[key] = val;
    }
  }
  return result;
}

export function isHttpsRequest(req: Request): boolean {
  if (req.secure) return true;
  const proto = req.get('x-forwarded-proto');
  if (proto && proto.split(',')[0].trim().toLowerCase() === 'https') {
    return true;
  }
  return process.env.NODE_ENV === 'production';
}

export function buildHardenedCookieOptions(
  req: Request,
  options: { httpOnly: boolean; maxAgeMs: number }
): CookieOptions {
  return {
    httpOnly: options.httpOnly,
    sameSite: 'lax',
    secure: isHttpsRequest(req),
    path: '/',
    maxAge: options.maxAgeMs,
  };
}

export function buildClearCookieOptions(req: Request, httpOnly: boolean): CookieOptions {
  return {
    httpOnly,
    sameSite: 'lax',
    secure: isHttpsRequest(req),
    path: '/',
  };
}

/**
 * Checks whether an incoming browser Origin or Referer header matches the request's host.
 * Requests with neither Origin nor Referer (e.g. non-browser CLI/Supertest clients) return true
 * so headless Bearer-token / unit clients work cleanly while cross-site browser forms are blocked.
 */
export function isSameOriginRequest(req: Request): boolean {
  const hostHeader = (req.get('x-forwarded-host') || req.get('host') || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  if (!hostHeader) return true;

  const origin = req.get('origin');
  if (origin) {
    try {
      const originUrl = new URL(origin);
      return originUrl.host.toLowerCase() === hostHeader;
    } catch {
      return false;
    }
  }

  const referer = req.get('referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return refererUrl.host.toLowerCase() === hostHeader;
    } catch {
      return false;
    }
  }

  return true;
}

export interface RateLimitPolicy {
  name: string;
  windowMs: number;
  maxRequests: number;
}

interface RateLimitBucket {
  count: number;
  resetAtMs: number;
}

export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();

  consume(
    key: string,
    policy: RateLimitPolicy,
    nowMs = Date.now()
  ): { allowed: boolean; remaining: number; resetAtMs: number; retryAfterSeconds: number } {
    if (this.buckets.size > 5000) {
      for (const [bucketKey, bucket] of this.buckets.entries()) {
        if (bucket.resetAtMs <= nowMs) {
          this.buckets.delete(bucketKey);
        }
      }
    }

    const fullKey = `${policy.name}:${key}`;
    const existing = this.buckets.get(fullKey);
    if (!existing || existing.resetAtMs <= nowMs) {
      const fresh: RateLimitBucket = {
        count: 1,
        resetAtMs: nowMs + policy.windowMs,
      };
      this.buckets.set(fullKey, fresh);
      return {
        allowed: true,
        remaining: Math.max(0, policy.maxRequests - 1),
        resetAtMs: fresh.resetAtMs,
        retryAfterSeconds: Math.ceil(policy.windowMs / 1000),
      };
    }

    existing.count += 1;
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAtMs - nowMs) / 1000));
    if (existing.count > policy.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAtMs: existing.resetAtMs,
        retryAfterSeconds,
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, policy.maxRequests - existing.count),
      resetAtMs: existing.resetAtMs,
      retryAfterSeconds,
    };
  }

  middleware(policy: RateLimitPolicy, keyResolver?: (req: Request) => string) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const clientKey = keyResolver ? keyResolver(req) : req.ip || 'unknown';
      const result = this.consume(clientKey, policy);
      res.setHeader('X-RateLimit-Limit', String(policy.maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetAtMs / 1000)));
      if (!result.allowed) {
        res.setHeader('Retry-After', String(result.retryAfterSeconds));
        res.status(429).json({
          error: `Rate limit exceeded for ${policy.name}. Retry after ${result.retryAfterSeconds}s.`,
          retryAfterSeconds: result.retryAfterSeconds,
        });
        return;
      }
      next();
    };
  }
}

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-XSS-Protection', '0');

  // Lock down API & redirect responses against framing without breaking AI Studio's SPA preview iframe
  if (req.path.startsWith('/api/') || req.path.startsWith('/r/')) {
    res.setHeader('X-Frame-Options', 'DENY');
  }
  if (req.path.startsWith('/api/auth/') || req.path.startsWith('/api/admin/')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
}

export function apiTimeoutMiddleware(timeoutMs = 15_000) {
  const safeTimeout = Math.max(25, Math.min(120_000, timeoutMs));
  return (_req: Request, res: Response, next: NextFunction): void => {
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      if (!res.headersSent) {
        res.status(504).json({
          error: 'Request timed out before completing. Please retry.',
        });
      }
    }, safeTimeout);
    timer.unref?.();

    const clear = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
      }
    };
    res.on('finish', clear);
    res.on('close', clear);
    next();
  };
}

export function apiErrorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (res.headersSent) {
    return;
  }

  const typedErr = err as { type?: string; status?: number; statusCode?: number; message?: string };
  if (typedErr?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    res.status(400).json({
      error: 'Malformed JSON request payload.',
    });
    return;
  }

  if (typedErr?.type === 'entity.too.large' || typedErr?.status === 413) {
    res.status(413).json({
      error: 'Request payload exceeds maximum allowed size.',
    });
    return;
  }

  const statusCode =
    typeof typedErr?.statusCode === 'number' &&
    typedErr.statusCode >= 400 &&
    typedErr.statusCode < 500
      ? typedErr.statusCode
      : 500;

  if (statusCode >= 500) {
    console.error('[EDISON API Error]', err instanceof Error ? err.message : 'Unexpected error');
    res.status(500).json({
      error: 'Internal server error.',
    });
    return;
  }

  res.status(statusCode).json({
    error: typedErr?.message || 'Request failed.',
  });
}

