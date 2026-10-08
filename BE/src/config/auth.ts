import './index';
import { BCRYPT_ROUNDS } from '../utils/password';

function secret(name: string): string {
  const value = process.env[name];
  if (!value || Buffer.byteLength(value, 'utf8') < 32 || value.trim().length < 32) {
    throw new Error(`${name} must contain at least 32 bytes of random secret material.`);
  }
  return value;
}
function duration(name: string, fallback: string, min: number, max: number): number {
  const match = /^(\d+)(s|m|h|d)?$/.exec(process.env[name] ?? fallback);
  const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  const seconds = match ? Number(match[1]) * (units[match[2] ?? 's'] ?? 1) : NaN;
  if (!Number.isSafeInteger(seconds) || seconds < min || seconds > max) {
    throw new Error(`${name} must be seconds or a duration like 15m/7d, between ${min} and ${max} seconds.`);
  }
  return seconds;
}
const accessSecret = secret('JWT_ACCESS_SECRET');
const refreshSecret = secret('JWT_REFRESH_SECRET');
if (accessSecret === refreshSecret) throw new Error('Access and refresh secrets must be different.');
export const authConfig = Object.freeze({
  accessSecret, refreshSecret,
  accessTokenTtlSeconds: duration('JWT_ACCESS_EXPIRES_IN', '15m', 60, 3600),
  refreshTokenTtlSeconds: duration('JWT_REFRESH_EXPIRES_IN', '7d', 86400, 90 * 86400),
  issuer: 'trackrupee-api', audience: 'trackrupee-client', bcryptRounds: BCRYPT_ROUNDS,
});
