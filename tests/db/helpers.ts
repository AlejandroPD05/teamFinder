import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Db = SupabaseClient<Database>;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secret = process.env.SUPABASE_SECRET_KEY!;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

export function assertEnv() {
  if (!url || !publishable || !secret) throw new Error("Faltan variables de .env.local para los tests de BD");
}

export const admin = (): Db => createClient<Database>(url, secret, opts);
export const anon = (): Db => createClient<Database>(url, publishable, opts);

/** Crea un usuario confirmado y devuelve su id y un cliente con su sesión. */
export async function createUser(tag: string, meta: Record<string, string> = {}) {
  const email = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.test`;
  const password = `Test-${crypto.randomUUID()}`;
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: meta,
  });
  if (error) throw error;
  const client = anon();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}

export async function deleteUsers(ids: string[]) {
  const db = admin();
  await Promise.all(ids.filter(Boolean).map((id) => db.auth.admin.deleteUser(id)));
}
