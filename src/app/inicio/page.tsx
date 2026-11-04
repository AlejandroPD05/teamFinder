import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inicio" };

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/entrar?next=/inicio");

  const [{ data: profile }, { data: gameProfile }] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url").eq("id", userId).single(),
    supabase
      .from("game_profiles")
      .select("rank_source, game_ranks(name)")
      .eq("user_id", userId)
      .eq("game_id", "valorant")
      .maybeSingle(),
  ]);

  const name = profile?.display_name ?? "Jugador";
  const rank = gameProfile?.game_ranks?.name;

  return (
    <section className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        {profile?.avatar_url ? (
          <Image src={profile.avatar_url} alt="" width={56} height={56} className="rounded-full" />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-full bg-panel text-xl font-semibold"
          >
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{es.dashboard.title(name)}</h1>
          <p className="text-muted">{es.dashboard.lead}</p>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-panel p-5">
        <h2 className="font-semibold">{es.dashboard.profileTitle}</h2>
        <dl className="mt-3 grid gap-1 text-sm">
          <dt className="text-muted">{es.dashboard.rankLabel}</dt>
          <dd>{rank ?? es.dashboard.rankNone}</dd>
        </dl>
        <p className="mt-4 text-sm text-muted">{es.dashboard.profileHint}</p>
        <p className="mt-2 inline-block rounded border border-line px-2 py-1 text-xs text-muted">
          {es.dashboard.riot}
        </p>
      </div>
    </section>
  );
}
