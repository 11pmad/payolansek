import crypto from 'node:crypto';

export const SESSION_COOKIE_NAME = 'simlansia_session';
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hashHex] = parts;
  if (!salt || !hashHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hashHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(val);
    } catch {
      cookies[key] = val;
    }
  }
  return cookies;
}

const MAX_FAILED_ATTEMPTS = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

interface FailureBucket {
  count: number;
  firstFailedAt: number;
}

const loginFailures = new Map<string, FailureBucket>();

export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const bucket = loginFailures.get(ip);
  if (!bucket) return { allowed: true };
  const elapsed = Date.now() - bucket.firstFailedAt;
  if (elapsed >= RATE_LIMIT_WINDOW_MS) {
    loginFailures.delete(ip);
    return { allowed: true };
  }
  if (bucket.count >= MAX_FAILED_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((RATE_LIMIT_WINDOW_MS - elapsed) / 1000),
    };
  }
  return { allowed: true };
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const bucket = loginFailures.get(ip);
  if (!bucket || now - bucket.firstFailedAt >= RATE_LIMIT_WINDOW_MS) {
    loginFailures.set(ip, { count: 1, firstFailedAt: now });
  } else {
    bucket.count += 1;
  }
}

export function clearLoginFailures(ip: string): void {
  loginFailures.delete(ip);
}
