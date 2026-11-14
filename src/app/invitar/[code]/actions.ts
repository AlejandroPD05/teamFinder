"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { inviteCode } from "@/lib/invite";
import { translator } from "@/lib/i18n/translator";
import { createClient } from "@/lib/supabase/server";

export type InviteState = { ok: false; message: string } | null;

/** Quien entra con un enlace de invitación queda como invitado de esa persona (solo cuentas nuevas). */
export async function acceptInviteAction(_p: InviteState, fd: FormData): Promise<InviteState> {
  const code = inviteCode.safeParse(fd.get("code"));
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect(code.success ? `/entrar?next=/invitar/${code.data}` : "/entrar");
  const t = translator(await getLocale(), "invite");
  if (!code.success) return { ok: false, message: t("invalid") };
  const { data: accepted, error } = await supabase.rpc("accept_invite", { p_code: code.data });
  if (error || !accepted) return { ok: false, message: t("notAccepted") };
  redirect("/inicio");
}
