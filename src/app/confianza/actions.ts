"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getLocale } from "next-intl/server";
import { KARMA_TAGS, REPORT_REASONS } from "@/lib/trust/options";
import { errorMessage, translator } from "@/lib/i18n/translator";
import { keys } from "@/lib/profile/options";
import { createClient } from "@/lib/supabase/server";

export type TrustState = { ok: boolean; message: string } | null;

const uuid = z.uuid();
const text500 = (t: ReturnType<typeof translator<"trust">>) => z.string().trim().max(500, t("max500")).regex(/^[^<>]*$/, t("chars"));

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/entrar");
  return supabase;
}

/** Textos en el idioma de la petición. */
async function messages() {
  const locale = await getLocale();
  return { t: translator(locale, "trust"), trustError: (hint?: string | null) => errorMessage("trust", hint, locale) };
}

const done = (paths: string[], message: string): TrustState => {
  paths.forEach((p) => revalidatePath(p));
  return { ok: true, message };
};

export async function blockAction(_p: TrustState, fd: FormData): Promise<TrustState> {
  const supabase = await session();
  const { t, trustError } = await messages();
  const user = uuid.safeParse(fd.get("user_id"));
  if (!user.success) return { ok: false, message: trustError() };
  const unblock = fd.get("intent") === "unblock";
  const { error } = await supabase.rpc(unblock ? "unblock_user" : "block_user", { p_user: user.data });
  if (error) return { ok: false, message: trustError(error.hint) };
  return done([`/jugador/${user.data}`, "/ajustes", "/buscar"], unblock ? t("unblocked") : t("blocked"));
}

const reportSchema = (t: ReturnType<typeof translator<"trust">>) => z.object({
  target: uuid,
  reason: z.enum(keys(REPORT_REASONS)),
  details: text500(t),
  message: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().positive().nullable()),
  lobby: z.preprocess((v) => (v === "" || v == null ? null : v), uuid.nullable()),
});

export async function reportAction(_p: TrustState, fd: FormData): Promise<TrustState> {
  const supabase = await session();
  const { t, trustError } = await messages();
  const r = reportSchema(t).safeParse({
    target: fd.get("target"),
    reason: fd.get("reason"),
    details: fd.get("details") ?? "",
    message: fd.get("message_id"),
    lobby: fd.get("lobby_id"),
  });
  if (!r.success) return { ok: false, message: r.error.issues[0].path[0] === "details" ? r.error.issues[0].message : t("chooseReason") };
  const { error } = await supabase.rpc("report_user", {
    p_target: r.data.target,
    p_reason: r.data.reason,
    p_details: r.data.details,
    p_message: r.data.message ?? (null as unknown as number),
    p_lobby: r.data.lobby ?? (null as unknown as string),
  });
  if (error) return { ok: false, message: trustError(error.hint) };
  return { ok: true, message: t("reported") };
}

const voteSchema = (t: ReturnType<typeof translator<"trust">>) => z.object({
  lobby: uuid,
  target: uuid,
  value: z.literal("1"),
  tags: z.array(z.enum(keys(KARMA_TAGS))).max(3, t("tagsMax")),
});

export async function voteAction(_p: TrustState, fd: FormData): Promise<TrustState> {
  const supabase = await session();
  const { t, trustError } = await messages();
  const v = voteSchema(t).safeParse({ lobby: fd.get("lobby_id"), target: fd.get("target"), value: fd.get("value"), tags: fd.getAll("tags") });
  if (!v.success) return { ok: false, message: v.error.issues[0].message };
  const { error } = await supabase.rpc("vote_karma", {
    p_lobby: v.data.lobby,
    p_target: v.data.target,
    p_value: Number(v.data.value),
    p_tags: v.data.tags,
  });
  if (error) return { ok: false, message: trustError(error.hint) };
  return done([`/grupos/${v.data.lobby}`, `/jugador/${v.data.target}`], t("voted"));
}

const resolveSchema = (t: ReturnType<typeof translator<"trust">>) =>
  z.object({ report: uuid, status: z.enum(["actioned", "dismissed"]), note: text500(t) });

export async function resolveAction(_p: TrustState, fd: FormData): Promise<TrustState> {
  const supabase = await session();
  const { t, trustError } = await messages();
  const v = resolveSchema(t).safeParse({ report: fd.get("report_id"), status: fd.get("status"), note: fd.get("note") ?? "" });
  if (!v.success) return { ok: false, message: v.error.issues[0].message };
  const { error } = await supabase.rpc("resolve_report", { p_report: v.data.report, p_status: v.data.status, p_note: v.data.note });
  if (error) return { ok: false, message: trustError(error.hint) };
  return done(["/moderacion"], t("resolved"));
}

export async function deleteAccountAction(_p: TrustState, fd: FormData): Promise<TrustState> {
  const supabase = await session();
  const { t, trustError } = await messages();
  // Vale la palabra en español (la de siempre) o la del idioma de la página.
  const confirm = fd.get("confirm");
  if (confirm !== "BORRAR" && confirm !== t("confirmWord")) return { ok: false, message: t("confirmDelete", { word: t("confirmWord") }) };
  // Las imágenes de fanart están en el almacenamiento (no en la base de datos): se borran con la API, antes de la cuenta.
  const { data: fanart } = await supabase.from("fanart_submissions").select("image_path");
  if (fanart?.length) await supabase.storage.from("fanart").remove(fanart.map((f) => f.image_path));
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { ok: false, message: trustError(error.hint) };
  await supabase.auth.signOut();
  redirect("/?cuenta=borrada");
}

const restrictSchema = (t: ReturnType<typeof translator<"trust">>) => z.object({
  user: uuid,
  days: z.coerce.number().int().refine((d) => [1, 3, 7, 30].includes(d), t("chooseDuration")),
  reason: z.string().trim().min(3, t("reasonMin")).max(500, t("max500")).regex(/^[^<>]*$/, t("chars")),
  report: z.preprocess((v) => (v === "" || v == null ? null : v), uuid.nullable()),
});

export async function restrictAction(_p: TrustState, fd: FormData): Promise<TrustState> {
  const supabase = await session();
  const { t, trustError } = await messages();
  const v = restrictSchema(t).safeParse({ user: fd.get("user_id"), days: fd.get("days"), reason: fd.get("reason") ?? "", report: fd.get("report_id") });
  if (!v.success) return { ok: false, message: v.error.issues[0].message };
  const { error } = await supabase.rpc("restrict_user", {
    p_user: v.data.user,
    p_days: v.data.days,
    p_reason: v.data.reason,
    p_report: v.data.report ?? undefined,
  });
  if (error) return { ok: false, message: trustError(error.hint) };
  return done(["/moderacion"], t("restricted", { count: v.data.days }));
}

export async function liftRestrictionAction(_p: TrustState, fd: FormData): Promise<TrustState> {
  const supabase = await session();
  const { t, trustError } = await messages();
  const id = uuid.safeParse(fd.get("restriction_id"));
  if (!id.success) return { ok: false, message: trustError() };
  const { error } = await supabase.rpc("lift_restriction", { p_restriction: id.data });
  if (error) return { ok: false, message: trustError(error.hint) };
  return done(["/moderacion"], t("lifted"));
}
