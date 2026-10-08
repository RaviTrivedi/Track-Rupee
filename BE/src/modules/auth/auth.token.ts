import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { authConfig } from '../../config/auth';
import { AppError } from '../../utils/app-error';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createAccessToken(userId: string): string {
  return jwt.sign({ tokenType: 'access' }, authConfig.accessSecret, {
    algorithm: 'HS256', subject: userId, jwtid: randomUUID(),
    issuer: authConfig.issuer, audience: authConfig.audience,
    expiresIn: authConfig.accessTokenTtlSeconds,
  });
}
export function createRefreshToken(userId: string, id: string, expiresAt: Date): string {
  return jwt.sign({ tokenType: 'refresh', exp: Math.floor(expiresAt.getTime() / 1000) }, authConfig.refreshSecret, {
    algorithm: 'HS256', subject: userId, jwtid: id,
    issuer: authConfig.issuer, audience: `${authConfig.audience}:refresh`,
  });
}
function verify(token: string, type: 'access' | 'refresh'): jwt.JwtPayload {
  try {
    const payload = jwt.verify(token, type === 'access' ? authConfig.accessSecret : authConfig.refreshSecret, {
      algorithms: ['HS256'], issuer: authConfig.issuer,
      audience: type === 'access' ? authConfig.audience : `${authConfig.audience}:refresh`,
      maxAge: type === 'access' ? authConfig.accessTokenTtlSeconds : authConfig.refreshTokenTtlSeconds,
    });
    if (typeof payload === 'string' || typeof payload.sub !== 'string' || !uuid.test(payload.sub)
      || typeof payload.jti !== 'string' || !uuid.test(payload.jti) || payload.tokenType !== type
      || typeof payload.exp !== 'number' || typeof payload.iat !== 'number'
      || payload.iat > Math.floor(Date.now() / 1000) || payload.exp <= payload.iat) {
      throw new Error('Invalid claims.');
    }
    return payload;
  } catch { throw new AppError(`Invalid or expired ${type} token.`, 401); }
}
export function verifyAccessToken(token: string): string { return verify(token, 'access').sub!; }
export function verifyRefreshToken(token: string): { userId: string; id: string } {
  const payload = verify(token, 'refresh');
  return { userId: payload.sub!, id: payload.jti! };
}
