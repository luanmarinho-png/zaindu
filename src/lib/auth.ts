import { createClient, supabaseConfigured } from '@/lib/supabase/server';

export async function hasClinicSession(): Promise<boolean> {
  if (!supabaseConfigured()) return false;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return !error && Boolean(data.user);
}
