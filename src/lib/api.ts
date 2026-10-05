import { NextResponse } from 'next/server';
import { getAccess } from '@/lib/auth';
import type { Access } from '@/lib/clinic/permissions';

export const noStore = { 'Cache-Control': 'no-store' };
export const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: noStore });

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const body = await request.json().catch(() => null);
  return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null;
}

export async function requireAdmin(): Promise<Access | NextResponse> {
  const access = await getAccess();
  if (!access) return fail('Acesso não autorizado.', 401);
  if (access.role !== 'admin') return fail('Só o administrador pode fazer isso.', 403);
  return access;
}

export const COLOR = /^#[0-9a-f]{6}$/i;
// Logo vai como data URL no documento da clínica; 400 KB cobre um PNG/SVG de marca com folga.
export const MAX_LOGO_CHARS = 400_000;
export function cleanLogo(value: unknown): string | null {
  if (value === '' || value === null) return '';
  if (typeof value !== 'string' || value.length > MAX_LOGO_CHARS || !/^data:image\/(png|jpeg|webp|svg\+xml);base64,[a-z0-9+/=]+$/i.test(value)) return null;
  return value;
}

// Fotos do prontuário: SVG fica de fora porque, aberto direto no navegador, roda script no domínio do app.
export const SAFE_IMAGE = /^image\/(jpeg|png|webp|gif|heic|heif)$/;

// Admin gerencia qualquer clínica e cria gestoras; a gestora só gerencia a equipe da própria clínica.
export async function teamScope(requestedClinic: unknown): Promise<{ access: Access; clinicId: string } | NextResponse> {
  const access = await getAccess();
  if (!access) return fail('Acesso não autorizado.', 401);
  if (access.role === 'member') return fail('Só a gestora da clínica gerencia a equipe.', 403);
  const clinicId = access.role === 'admin' ? String(requestedClinic || access.clinicId || '') : access.clinicId;
  if (!clinicId) return fail('Escolha uma clínica.', 400);
  return { access, clinicId };
}
