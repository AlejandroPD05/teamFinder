import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlayerPage from "../jugador/[id]/page";

export const metadata: Metadata = { title: "Mi perfil" };

/** «Mi perfil»: resumen del perfil propio tal como lo ven los demás, con el botón para editarlo. */
export default async function MyProfilePage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/entrar?next=/perfil");
  return PlayerPage({ params: Promise.resolve({ id: userId }), searchParams: Promise.resolve({}) });
}
