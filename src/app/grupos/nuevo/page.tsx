import { currentGame } from "@/lib/games";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadCatalog } from "@/lib/profile/queries";
import { createClient } from "@/lib/supabase/server";
import { LobbyForm } from "./lobby-form";

export const metadata: Metadata = { title: "Crear grupo" };

export default async function NewLobbyPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/entrar?next=/grupos/nuevo");
  const { game } = await currentGame(supabase);
  const catalog = await loadCatalog(supabase, game.id);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Crear grupo de {game.name}</h1>
        <p className="text-muted">Tú ocupas la primera plaza. Las solicitudes te llegan a la página del grupo.</p>
      </div>
      <LobbyForm catalog={catalog} />
    </section>
  );
}
