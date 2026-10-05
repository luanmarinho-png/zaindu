import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Chave secreta só existe no servidor: com ela o app cria, troca a senha e remove logins.
export function supabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Colar a chave pelo terminal pode trazer quebra de linha no fim.
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function findUserId(admin: SupabaseClient, email: string): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find(item => item.email?.toLowerCase() === email);
    if (user) return user.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

export type LoginResult = 'created' | 'updated' | 'exists' | 'unconfigured';

// Cria o login já confirmado (as contas @zaindu.app não têm caixa de e-mail). Se já existir e vier senha, troca a senha.
export async function upsertLogin(email: string, password: string, name: string): Promise<LoginResult> {
  const admin = supabaseAdmin();
  if (!admin) return 'unconfigured';
  const id = await findUserId(admin, email);
  if (id) {
    if (!password) return 'exists';
    const { error } = await admin.auth.admin.updateUserById(id, { password, email_confirm: true, user_metadata: { name } });
    if (error) throw error;
    return 'updated';
  }
  if (!password) throw new Error('Defina uma senha para o novo usuário.');
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (error) throw error;
  return 'created';
}

export async function removeLogin(email: string): Promise<void> {
  const admin = supabaseAdmin();
  if (!admin) return;
  const id = await findUserId(admin, email);
  if (id) await admin.auth.admin.deleteUser(id);
}
