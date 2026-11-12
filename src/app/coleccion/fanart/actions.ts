"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { FANART_LICENSE_VERSION, fanartError, fanartSchema } from "@/lib/fanart";
import { createClient } from "@/lib/supabase/server";

export type FanartState = { ok: boolean; message: string } | null;

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/entrar?next=/coleccion/fanart");
  return { supabase, userId: data.claims.sub };
}

/** La imagen ya está subida al bucket (desde el navegador, a la carpeta de la persona); aquí se registra el envío. */
export async function submitFanartAction(_p: FanartState, fd: FormData): Promise<FanartState> {
  const { supabase, userId } = await session();
  const v = fanartSchema.safeParse({
    game: fd.get("game"),
    title: fd.get("title") ?? "",
    artist: fd.get("artist") ?? "",
    portfolio: fd.get("portfolio") ?? "",
    path: fd.get("path") ?? "",
    license: fd.get("license"),
  });
  if (!v.success) return { ok: false, message: v.error.issues[0].message };
  if (!v.data.path.startsWith(`${userId}/`)) return { ok: false, message: fanartError("invalid") };
  const { error } = await supabase.rpc("submit_fanart", {
    p_game: v.data.game,
    p_title: v.data.title,
    p_artist: v.data.artist,
    p_portfolio: v.data.portfolio ?? "",
    p_path: v.data.path,
    p_license: FANART_LICENSE_VERSION,
  });
  if (error) {
    // Sin envío registrado la imagen no sirve: se borra.
    await supabase.storage.from("fanart").remove([v.data.path]);
    return { ok: false, message: fanartError(error.hint) };
  }
  revalidatePath("/coleccion/fanart");
  revalidatePath("/moderacion");
  return { ok: true, message: "¡Gracias! Moderación la revisará y te avisaremos." };
}

/** Retirar el permiso: la carta deja de mostrarse y se borra la imagen. */
export async function withdrawFanartAction(_p: FanartState, fd: FormData): Promise<FanartState> {
  const { supabase } = await session();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { ok: false, message: fanartError() };
  const { data: row } = await supabase.from("fanart_submissions").select("image_path").eq("id", id.data).maybeSingle();
  const { error } = await supabase.rpc("withdraw_fanart", { p_id: id.data });
  if (error || !row) return { ok: false, message: fanartError(error?.hint) };
  await supabase.storage.from("fanart").remove([row.image_path]);
  revalidatePath("/coleccion/fanart");
  revalidatePath("/coleccion");
  return { ok: true, message: "Retirada. La carta ya no se muestra." };
}

const reviewSchema = z.object({
  id: z.uuid(),
  decision: z.enum(["approve", "reject"]),
  rarity: z.enum(["common", "rare", "epic", "legendary"]),
  note: z.string().trim().max(300, "Máximo 300 caracteres.").regex(/^[^<>]*$/, "Sin < ni >."),
});

export async function reviewFanartAction(_p: FanartState, fd: FormData): Promise<FanartState> {
  const { supabase } = await session();
  const v = reviewSchema.safeParse({
    id: fd.get("id"),
    decision: fd.get("decision"),
    rarity: fd.get("rarity") ?? "rare",
    note: fd.get("note") ?? "",
  });
  if (!v.success) return { ok: false, message: v.error.issues[0].message };
  const { data: row } = await supabase.from("fanart_submissions").select("image_path").eq("id", v.data.id).maybeSingle();
  if (!row) return { ok: false, message: fanartError() };
  const approve = v.data.decision === "approve";
  const { error } = await supabase.rpc("review_fanart", {
    p_id: v.data.id,
    p_approve: approve,
    p_image_url: supabase.storage.from("fanart").getPublicUrl(row.image_path).data.publicUrl,
    p_rarity: v.data.rarity,
    p_note: v.data.note,
  });
  if (error) return { ok: false, message: fanartError(error.hint) };
  revalidatePath("/moderacion");
  revalidatePath("/coleccion");
  return { ok: true, message: approve ? "Aprobada: ya es una carta." : "Rechazada. Se ha avisado a la persona." };
}
