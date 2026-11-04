"use server";

import { redirect } from "next/navigation";
import { emailSchema, safeNextPath } from "@/lib/auth";
import { siteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

function callbackUrl(next: string) {
  return `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
}

function back(params: Record<string, string>): never {
  redirect(`/entrar?${new URLSearchParams(params).toString()}`);
}

export async function signInWithDiscord(formData: FormData) {
  const next = safeNextPath(formData.get("next")?.toString());
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: { redirectTo: callbackUrl(next), scopes: "identify email" },
  });
  if (error || !data.url) back({ error: "oauth", next });
  redirect(data.url);
}

export async function signInWithEmail(formData: FormData) {
  const next = safeNextPath(formData.get("next")?.toString());
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) back({ error: "invalid_email", next });

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: callbackUrl(next), shouldCreateUser: true },
  });
  if (error) back({ error: error.status === 429 ? "rate_limited" : "unknown", next });
  back({ sent: "1", next });
}
