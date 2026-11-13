import { currentGame } from "@/lib/games";
import { getTranslations } from "next-intl/server";
import { titled } from "@/lib/i18n/metadata";
import { redirect } from "next/navigation";
import { loadCatalog } from "@/lib/profile/queries";
import { createClient } from "@/lib/supabase/server";
import { LobbyForm } from "./lobby-form";

export const generateMetadata = titled("newLobby");

export default async function NewLobbyPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/entrar?next=/grupos/nuevo");
  const { game } = await currentGame();
  const catalog = await loadCatalog(supabase, game.id);
  const t = await getTranslations("lobbyForm");

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">{t("title", { game: game.name })}</h1>
        <p className="text-muted">{t("lead")}</p>
      </div>
      <LobbyForm catalog={catalog} />
    </section>
  );
}
