import { createHash, timingSafeEqual } from 'node:crypto';

/*
 * Refresh JWTs contain a random identifier and cryptographic signature.
 * SHA-256 stores a fingerprint, not a usable bearer credential. Human passwords
 * still require slow bcrypt; never use this helper to hash passwords.
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
export function matchesRefreshToken(token: string, hash: string): boolean {
  const actual = Buffer.from(hashRefreshToken(token), 'hex');
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
