"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dmError } from "@/lib/dm";
import { keys } from "@/lib/profile/options";
import { REPORT_REASONS } from "@/lib/trust/options";

export type DmState = { ok: boolean; message: string } | null;

/** Abre (o recupera) la conversación con otra persona y lleva a ella. */
export async function startConversationAction(_p: DmState, fd: FormData): Promise<DmState> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/entrar");
  const other = z.uuid().safeParse(fd.get("user_id"));
  if (!other.success) return { ok: false, message: dmError() };
  const { data, error } = await supabase.rpc("start_conversation", { p_other: other.data });
  if (error || !data) return { ok: false, message: dmError(error?.hint) };
  revalidatePath("/mensajes");
  redirect(`/mensajes/${data}`);
}

const reportSchema = z.object({
  message: z.coerce.number().int().positive(),
  reason: z.enum(keys(REPORT_REASONS)),
  details: z.string().trim().max(500, "Máximo 500 caracteres.").regex(/^[^<>]*$/, "Sin < ni >."),
});

export async function reportDirectMessageAction(_p: DmState, fd: FormData): Promise<DmState> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/entrar");
  const r = reportSchema.safeParse({ message: fd.get("message_id"), reason: fd.get("reason"), details: fd.get("details") ?? "" });
  if (!r.success) return { ok: false, message: r.error.issues[0].path[0] === "reason" ? "Elige un motivo." : r.error.issues[0].message };
  const { error } = await supabase.rpc("report_direct_message", { p_message: r.data.message, p_reason: r.data.reason, p_details: r.data.details });
  if (error) return { ok: false, message: dmError(error.hint) };
  return { ok: true, message: "Denuncia enviada. La revisará el equipo de moderación." };
}
