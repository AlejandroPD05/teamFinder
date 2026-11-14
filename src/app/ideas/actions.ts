"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { translator } from "@/lib/i18n/translator";
import { ideaSchemaFor } from "@/lib/ideas";
import { createClient } from "@/lib/supabase/server";

export type IdeaState = { ok: boolean; message: string; fieldErrors?: Record<string, string> } | null;

async function context() {
  const supabase = await createClient();
  const locale = await getLocale();
  return { supabase, locale, t: translator(locale, "ideas") };
}

/** Apoyar una idea (o quitar el apoyo). Sin sesión, a entrar. */
export async function voteIdeaAction(_p: IdeaState, fd: FormData): Promise<IdeaState> {
  const { supabase, t } = await context();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/entrar?next=/ideas");
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { ok: false, message: t("error") };
  const on = fd.get("on") === "1";
  const { error } = await supabase.rpc("vote_idea", { p_idea: id.data, p_on: on });
  if (error) {
    const message = error.hint === "closed" ? t("closedVote") : error.hint === "restricted" ? t("restricted") : t("error");
    return { ok: false, message };
  }
  revalidatePath("/ideas");
  return { ok: true, message: on ? t("voted") : t("unvoted") };
}

/** Moderación: publicar una idea nueva (opcionalmente a partir de una sugerencia) o editar una existente. */
export async function saveIdeaAction(_p: IdeaState, fd: FormData): Promise<IdeaState> {
  const { supabase, locale, t } = await context();
  const parsed = ideaSchemaFor(locale).safeParse({ title: fd.get("title") ?? "", body: fd.get("body") ?? "", status: fd.get("status") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
    return { ok: false, message: t("checkFields"), fieldErrors };
  }
  const id = z.uuid().nullable().safeParse(fd.get("id") || null);
  const feedback = z.uuid().nullable().safeParse(fd.get("feedback_id") || null);
  if (!id.success || !feedback.success) return { ok: false, message: t("error") };
  const { error } = await supabase.rpc("save_idea", {
    p_id: id.data as string,
    p_title: parsed.data.title,
    p_body: parsed.data.body,
    p_status: parsed.data.status,
    p_feedback: feedback.data as string,
  });
  if (error) return { ok: false, message: t("error") };
  revalidatePath("/ideas");
  revalidatePath("/moderacion");
  return { ok: true, message: id.data ? t("saved") : t("published") };
}

export async function deleteIdeaAction(_p: IdeaState, fd: FormData): Promise<IdeaState> {
  const { supabase, t } = await context();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { ok: false, message: t("error") };
  const { error } = await supabase.rpc("delete_idea", { p_id: id.data });
  if (error) return { ok: false, message: t("error") };
  revalidatePath("/ideas");
  return { ok: true, message: t("deleted") };
}
