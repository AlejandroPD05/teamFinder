"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createLobbyFromForm, createLobbySchema, lobbyError, requestMessageSchema } from "@/lib/lobbies/schema";
import { currentGame } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { ok: boolean; message: string; fieldErrors?: Record<string, string> } | null;

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/entrar?next=/grupos");
  return supabase;
}

const lobbyId = z.uuid();
const nil = null as unknown as string;

export async function createLobby(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await session();
  const parsed = createLobbySchema.safeParse(createLobbyFromForm(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
    return { ok: false, message: "Revisa los campos marcados.", fieldErrors };
  }
  const v = parsed.data;
  const { data, error } = await supabase.rpc("create_lobby", {
    p_game_id: (await currentGame()).game.id,
    p_mode_slug: v.mode,
    p_note: v.note,
    p_rank_min: v.rank_min ?? nil,
    p_rank_max: v.rank_max ?? nil,
    p_region: v.region ?? nil,
    p_language: v.language ?? nil,
    p_goal: v.goal ?? nil,
    p_starts_at: v.startsAt?.toISOString() ?? nil,
    p_roles: v.roles,
  });
  if (error) return { ok: false, message: lobbyError(error.hint) };
  revalidatePath("/grupos");
  redirect(`/grupos/${data}`);
}

/** Acciones sobre un grupo concreto: devuelven un mensaje para el estado accesible. */
export async function lobbyAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await session();
  const id = lobbyId.safeParse(fd.get("lobby_id"));
  if (!id.success) return { ok: false, message: lobbyError() };
  const intent = fd.get("intent");
  let result: { error: { hint?: string | null } | null };
  let ok = "Hecho.";

  switch (intent) {
    case "request": {
      const msg = requestMessageSchema.safeParse(fd.get("message") ?? "");
      if (!msg.success) return { ok: false, message: msg.error.issues[0].message };
      result = await supabase.rpc("request_join", { p_lobby: id.data, p_message: msg.data });
      ok = "Solicitud enviada. El creador del grupo la verá en su página.";
      break;
    }
    case "withdraw":
      result = await supabase.rpc("withdraw_request", { p_lobby: id.data });
      ok = "Solicitud retirada.";
      break;
    case "accept":
    case "reject": {
      const req = lobbyId.safeParse(fd.get("request_id"));
      if (!req.success) return { ok: false, message: lobbyError() };
      result = await supabase.rpc("respond_request", { p_request: req.data, p_accept: intent === "accept" });
      ok = intent === "accept" ? "Solicitud aceptada." : "Solicitud rechazada.";
      break;
    }
    case "leave":
      result = await supabase.rpc("leave_lobby", { p_lobby: id.data });
      ok = "Has salido del grupo.";
      break;
    case "close":
      result = await supabase.rpc("close_lobby", { p_lobby: id.data });
      ok = "Grupo cerrado.";
      break;
    default:
      return { ok: false, message: lobbyError() };
  }

  if (result.error) return { ok: false, message: lobbyError(result.error.hint) };
  revalidatePath(`/grupos/${id.data}`);
  revalidatePath("/grupos");
  return { ok: true, message: ok };
}
