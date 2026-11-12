import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { CollectibleCard } from "@/components/collectible-card";
import { currentGame } from "@/lib/games";
import { loadCollection } from "@/lib/missions/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mi colección" };

export default async function CollectionPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/entrar?next=/coleccion");
  const { game } = await currentGame();
  const { cards, owned } = await loadCollection(supabase, game.id, userId);
  const credits = [...new Set(cards.map((c) => c.credit))];
  // Solo las cartas de este juego (la persona puede tener cartas de otros).
  const ownedHere = cards.filter((c) => owned.has(c.id)).length;

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-3xl font-semibold">Colección de {game.name}</h1>
        <p className="text-muted">
          {cards.length === 0
            ? `Aún no hay cartas de ${game.name}.`
            : `Tienes ${ownedHere} de ${cards.length} cartas. Consíguelas completando misiones.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/misiones" className="btn-ghost">
            Ver misiones
          </Link>
          <Link href="/coleccion/fanart" className="btn-ghost">
            Enviar tu fanart
          </Link>
        </div>
      </header>

      {cards.length > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map((c, i) => (
            <li key={c.id} className="enter" style={{ "--i": i } as CSSProperties}>
              <CollectibleCard card={c} locked={!owned.has(c.id)} />
            </li>
          ))}
        </ul>
      )}

      {credits.length > 0 && (
        <p className="text-xs text-muted">{credits.join(" · ")}. Las cartas no se compran ni se intercambian.</p>
      )}
    </section>
  );
}
