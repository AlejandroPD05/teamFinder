"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clipError, commentSchema, postClipSchema } from "@/lib/clips/schema";
import { currentGame } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";
import { keys } from "@/lib/profile/options";
import { REPORT_REASONS } from "@/lib/trust/options";

export type ClipState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  /** Lo que se envió, para no perderlo si hay que corregir algo (React vacía el formulario tras la acción). */
  values?: Record<string, string>;
} | null;

async function session(next = "/clips") {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  return supabase;
}

const uuid = z.uuid();

export async function postClip(_p: ClipState, fd: FormData): Promise<ClipState> {
  const supabase = await session("/clips/nuevo");
  const values = { url: String(fd.get("url") ?? ""), title: String(fd.get("title") ?? ""), emblem: String(fd.get("emblem") ?? "") };
  const parsed = postClipSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
    return { ok: false, message: "Revisa los campos marcados.", fieldErrors, values };
  }
  const { game } = await currentGame();
  const { data: id, error } = await supabase.rpc("post_clip", {
    p_game: game.id,
    p_emblem: parsed.data.emblem,
    p_title: parsed.data.title,
    p_provider: parsed.data.url.provider,
    p_video: parsed.data.url.videoId,
  });
  if (error) return { ok: false, message: clipError(error.hint), values };
  revalidatePath("/clips");
  redirect(`/clips/${id}`);
}

/** Da o quita un emblema. Funciona sin JavaScript (formulario). */
export async function toggleVote(fd: FormData): Promise<void> {
  const clip = uuid.safeParse(fd.get("clip"));
  const emblem = uuid.safeParse(fd.get("emblem"));
  if (!clip.success || !emblem.success) return;
  const supabase = await session(`/clips/${clip.data}`);
  await supabase.rpc("toggle_clip_vote", { p_clip: clip.data, p_emblem: emblem.data });
  revalidatePath(`/clips/${clip.data}`);
  revalidatePath("/clips");
}

export async function addComment(_p: ClipState, fd: FormData): Promise<ClipState> {
  const clip = uuid.safeParse(fd.get("clip"));
  if (!clip.success) return { ok: false, message: clipError("not_found") };
  const supabase = await session(`/clips/${clip.data}`);
  const body = commentSchema.safeParse(fd.get("body") ?? "");
  if (!body.success) return { ok: false, message: body.error.issues[0].message };
  const { error } = await supabase.rpc("comment_clip", { p_clip: clip.data, p_body: body.data });
  if (error) return { ok: false, message: clipError(error.hint) };
  revalidatePath(`/clips/${clip.data}`);
  return { ok: true, message: "Comentario publicado." };
}

export async function deleteComment(fd: FormData): Promise<void> {
  const clip = uuid.safeParse(fd.get("clip"));
  const comment = z.coerce.number().int().positive().safeParse(fd.get("comment"));
  if (!clip.success || !comment.success) return;
  const supabase = await session(`/clips/${clip.data}`);
  await supabase.rpc("delete_my_clip_comment", { p_comment: comment.data });
  revalidatePath(`/clips/${clip.data}`);
}

export async function deleteClip(fd: FormData): Promise<void> {
  const clip = uuid.safeParse(fd.get("clip"));
  if (!clip.success) return;
  const supabase = await session(`/clips/${clip.data}`);
  await supabase.rpc("delete_my_clip", { p_clip: clip.data });
  revalidatePath("/clips");
  redirect("/clips");
}

const reportSchema = z.object({
  clip: uuid,
  comment: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().positive().optional()),
  reason: z.enum(keys(REPORT_REASONS), "Elige un motivo."),
  details: z.string().trim().max(500, "Como mucho 500 caracteres."),
});

export async function reportClip(_p: ClipState, fd: FormData): Promise<ClipState> {
  const r = reportSchema.safeParse({
    clip: fd.get("clip"),
    comment: fd.get("comment"),
    reason: fd.get("reason"),
    details: fd.get("details") ?? "",
  });
  if (!r.success) return { ok: false, message: r.error.issues[0].message };
  const supabase = await session(`/clips/${r.data.clip}`);
  const { error } = await supabase.rpc("report_clip", {
    p_clip: r.data.clip,
    p_comment: r.data.comment ?? (null as unknown as number),
    p_reason: r.data.reason,
    p_details: r.data.details,
  });
  if (error) return { ok: false, message: clipError(error.hint) };
  return { ok: true, message: "Denuncia enviada. La revisará el equipo de moderación." };
}

/** Moderación: ocultar o volver a mostrar un clip o un comentario. */
export async function moderateClip(fd: FormData): Promise<void> {
  const clip = uuid.safeParse(fd.get("clip"));
  if (!clip.success) return;
  const comment = z.coerce.number().int().positive().safeParse(fd.get("comment"));
  const supabase = await session("/moderacion");
  await supabase.rpc("moderate_clip", {
    p_clip: clip.data,
    p_comment: comment.success ? comment.data : (null as unknown as number),
    p_hidden: fd.get("hidden") === "1",
    p_note: "",
  });
  revalidatePath("/moderacion");
  revalidatePath(`/clips/${clip.data}`);
}
