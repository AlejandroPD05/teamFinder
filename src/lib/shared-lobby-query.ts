import "server-only";
import { cache } from "react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/** Resumen público de un grupo compartido (o null si no existe o no se ha compartido). */
export const loadSharedLobby = cache(async (id: string) => {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("shared_lobby", { p_lobby: id });
  return data?.[0] ?? null;
});
