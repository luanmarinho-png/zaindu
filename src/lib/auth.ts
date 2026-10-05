import { createClient, supabaseConfigured } from '@/lib/supabase/server';

// Só contas @zaindu.app entram na clínica, mesmo que alguém crie conta pela API pública do Supabase.
const ALLOWED_EMAIL_DOMAIN = '@zaindu.app';

export function isClinicEmail(email: string | undefined): boolean {
  return Boolean(email?.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN));
}

export async function hasClinicSession(): Promise<boolean> {
  if (!supabaseConfigured()) return false;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return !error && isClinicEmail(data.user?.email);
}
