import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

export const CLINIC_SESSION_COOKIE = 'zaindu_clinic_session';

export function clinicUsername(): string | undefined {
  return process.env.CLINIC_ACCESS_USERNAME || undefined;
}

export function clinicPassword(): string | undefined {
  return process.env.CLINIC_ACCESS_PASSWORD || undefined;
}

export function safeSecretEqual(value: string, expected: string): boolean {
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function clinicSessionToken(): string | undefined {
  const username = clinicUsername();
  const password = clinicPassword();
  if (!username || !password) return undefined;
  return createHmac('sha256', password).update(`zaindu-clinic-session-v1:${username}`).digest('hex');
}

export function hasClinicSession(request: NextRequest): boolean {
  const expected = clinicSessionToken();
  const supplied = request.cookies.get(CLINIC_SESSION_COOKIE)?.value;
  return Boolean(expected && supplied && safeSecretEqual(supplied, expected));
}
