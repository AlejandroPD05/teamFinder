"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { KARMA_TAGS, REPORT_REASONS, trustError } from "@/lib/trust/options";
import { keys } from "@/lib/profile/options";
import { createClient } from "@/lib/supabase/server";

export type TrustState = { ok: boolean; message: string } | null;

const uuid = z.uuid();
const text500 = z.string().trim().max(500, "Máximo 500 caracteres.").regex(/^[^<>]*$/, "Sin < ni >.");

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/entrar");
  return supabase;
}

const done = (paths: string[], message: string): TrustState => {
  paths.forEach((p) => revalidatePath(p));
  return { ok: true, message };
};

export async function blockAction(_p: TrustState, fd: FormData): Promise<TrustState> {
  const supabase = await session();
  const user = uuid.safeParse(fd.get("user_id"));
  if (!user.success) return { ok: false, message: trustError() };
  const unblock = fd.get("intent") === "unblock";
  const { error } = await supabase.rpc(unblock ? "unblock_user" : "block_user", { p_user: user.data });
  if (error) return { ok: false, message: trustError(error.hint) };
  return done([`/jugador/${user.data}`, "/ajustes", "/buscar"], unblock ? "Desbloqueado." : "Bloqueado. Ya no os veréis en búsquedas ni grupos.");
}

const reportSchema = z.object({
  target: uuid,
  reason: z.enum(keys(REPORT_REASONS)),
  details: text500,
  message: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().positive().nullable()),
  lobby: z.preprocess((v) => (v === "" || v == null ? null : v), uuid.nullable()),
});

export async function reportAction(_p: TrustState, fd: FormData): Promise<TrustState> {
  const supabase = await session();
  const r = reportSchema.safeParse({
    target: fd.get("target"),
    reason: fd.get("reason"),
    details: fd.get("details") ?? "",
    message: fd.get("message_id"),
    lobby: fd.get("lobby_id"),
  });
  if (!r.success) return { ok: false, message: r.error.issues[0].message.startsWith("Invalid") ? "Elige un motivo." : r.error.issues[0].message };
  const { error } = await supabase.rpc("report_user", {
    p_target: r.data.target,
    p_reason: r.data.reason,
    p_details: r.data.details,
    p_message: r.data.message ?? (null as unknown as number),
    p_lobby: r.data.lobby ?? (null as unknown as string),
  });
  if (error) return { ok: false, message: trustError(error.hint) };
  return { ok: true, message: "Denuncia enviada. La revisará el equipo de moderación." };
}

const voteSchema = z.object({
  lobby: uuid,
  target: uuid,
  value: z.literal("1"),
  tags: z.array(z.enum(keys(KARMA_TAGS))).max(3, "Como mucho 3 etiquetas."),
});

export async function voteAction(_p: TrustState, fd: FormData): Promise<TrustState> {
  const supabase = await session();
  const v = voteSchema.safeParse({ lobby: fd.get("lobby_id"), target: fd.get("target"), value: fd.get("value"), tags: fd.getAll("tags") });
  if (!v.success) return { ok: false, message: v.error.issues[0].message };
  const { error } = await supabase.rpc("vote_karma", {
    p_lobby: v.data.lobby,
    p_target: v.data.target,
    p_value: Number(v.data.value),
    p_tags: v.data.tags,
  });
  if (error) return { ok: false, message: trustError(error.hint) };
  return done([`/grupos/${v.data.lobby}`, `/jugador/${v.data.target}`], "Valoración guardada.");
}

const resolveSchema = z.object({ report: uuid, status: z.enum(["actioned", "dismissed"]), note: text500 });

export async function resolveAction(_p: TrustState, fd: FormData): Promise<TrustState> {
  const supabase = await session();
  const v = resolveSchema.safeParse({ report: fd.get("report_id"), status: fd.get("status"), note: fd.get("note") ?? "" });
  if (!v.success) return { ok: false, message: v.error.issues[0].message };
  const { error } = await supabase.rpc("resolve_report", { p_report: v.data.report, p_status: v.data.status, p_note: v.data.note });
  if (error) return { ok: false, message: trustError(error.hint) };
  return done(["/moderacion"], "Denuncia resuelta.");
}

export async function deleteAccountAction(_p: TrustState, fd: FormData): Promise<TrustState> {
  const supabase = await session();
  if (fd.get("confirm") !== "BORRAR") return { ok: false, message: "Escribe BORRAR para confirmar." };
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { ok: false, message: trustError(error.hint) };
  await supabase.auth.signOut();
  redirect("/?cuenta=borrada");
}
