import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

export const CLINIC_SESSION_COOKIE = 'noria_clinic_session';

export function clinicPassword(): string | undefined {
  return process.env.CLINIC_ACCESS_PASSWORD || undefined;
}

export function safeSecretEqual(value: string, expected: string): boolean {
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function clinicSessionToken(): string | undefined {
  const password = clinicPassword();
  if (!password) return undefined;
  return createHmac('sha256', password).update('noria-clinic-session-v1').digest('hex');
}

export function hasClinicSession(request: NextRequest): boolean {
  const expected = clinicSessionToken();
  const supplied = request.cookies.get(CLINIC_SESSION_COOKIE)?.value;
  return Boolean(expected && supplied && safeSecretEqual(supplied, expected));
}
