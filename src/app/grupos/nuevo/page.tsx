import { currentGame } from "@/lib/games";
import { getTranslations } from "next-intl/server";
import { titled } from "@/lib/i18n/metadata";
import { redirect } from "next/navigation";
import { loadCatalog } from "@/lib/profile/queries";
import { createClient } from "@/lib/supabase/server";
import { LobbyForm } from "./lobby-form";
import { QuickLobbies } from "./quick-lobbies";

export const generateMetadata = titled("newLobby");

export default async function NewLobbyPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/entrar?next=/grupos/nuevo");
  const { game } = await currentGame();
  const [catalog, t, { data: templates }, { data: last }] = await Promise.all([
    loadCatalog(supabase, game.id),
    getTranslations("lobbyForm"),
    supabase
      .from("lobby_templates")
      .select("id, name, mode_slug, rank_min_id, rank_max_id, region_id, roles")
      .eq("game_id", game.id)
      .order("created_at"),
    supabase
      .from("lobbies")
      .select("id, mode_slug, rank_min_id, rank_max_id, region_id, lobby_needed_roles(role_id)")
      .eq("owner_id", userId)
      .eq("game_id", game.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  // Resumen de una plantilla o grupo: modo · roles que busca · rango · servidor.
  const summary = (x: { mode_slug: string; rank_min_id: string | null; rank_max_id: string | null; region_id: string | null; roles: string[] }) => {
    const rank = (rid: string | null) => catalog.ranks.find((r) => r.id === rid)?.name;
    const range = x.rank_min_id || x.rank_max_id ? `${rank(x.rank_min_id) ?? "—"}–${rank(x.rank_max_id) ?? "—"}` : null;
    return [
      catalog.modes.find((m) => m.slug === x.mode_slug)?.name ?? x.mode_slug,
      x.roles.map((rid) => catalog.roles.find((r) => r.id === rid)?.name).filter(Boolean).join(", ") || null,
      range,
      catalog.regions.find((r) => r.id === x.region_id)?.name,
    ]
      .filter(Boolean)
      .join(" · ");
  };
  const tpls = (templates ?? []).map((x) => ({ id: x.id, name: x.name, summary: summary(x) }));
  const lastLobby = last ? { id: last.id, summary: summary({ ...last, roles: last.lobby_needed_roles.map((r) => r.role_id) }) } : null;

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">{t("title", { game: game.name })}</h1>
        <p className="text-muted">{t("lead")}</p>
      </div>
      {(tpls.length > 0 || lastLobby) && <QuickLobbies templates={tpls} last={lastLobby} />}
      <LobbyForm catalog={catalog} />
    </section>
  );
}
