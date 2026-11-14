"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { feedbackSchemaFor } from "@/lib/feedback";
import { errorMessage, translator } from "@/lib/i18n/translator";
import { createClient } from "@/lib/supabase/server";

export type FeedbackState = { ok: boolean; message: string; fieldErrors?: Record<string, string> } | null;

export async function sendFeedbackAction(_p: FeedbackState, fd: FormData): Promise<FeedbackState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/entrar?next=/sugerencias");
  const locale = await getLocale();
  const t = translator(locale, "feedback");
  const parsed = feedbackSchemaFor(locale).safeParse({ kind: fd.get("kind"), body: fd.get("body") ?? "", page: fd.get("page") || null });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
    return { ok: false, message: t("checkFields"), fieldErrors };
  }
  const { error } = await supabase.rpc("send_feedback", { p_kind: parsed.data.kind, p_body: parsed.data.body, p_page: parsed.data.page ?? "" });
  if (error) return { ok: false, message: errorMessage("feedback", error.hint, locale) };
  return { ok: true, message: t("sent") };
}

/** Moderación: marcar una sugerencia como atendida (o volver a abrirla). */
export async function feedbackStatusAction(_p: FeedbackState, fd: FormData): Promise<FeedbackState> {
  const supabase = await createClient();
  const locale = await getLocale();
  const t = translator(locale, "feedback");
  const id = z.uuid().safeParse(fd.get("id"));
  const status = z.enum(["new", "done"]).safeParse(fd.get("status"));
  if (!id.success || !status.success) return { ok: false, message: t("error") };
  const { error } = await supabase.rpc("set_feedback_status", { p_id: id.data, p_status: status.data });
  if (error) return { ok: false, message: t("error") };
  revalidatePath("/moderacion");
  return { ok: true, message: t("marked") };
}
