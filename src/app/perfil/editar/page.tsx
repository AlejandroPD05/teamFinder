import { currentGame } from "@/lib/games";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loadCatalog, loadOwnProfile } from "@/lib/profile/queries";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Editar perfil" };

export default async function EditProfilePage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/entrar?next=/perfil/editar");

  const { game: active } = await currentGame();
  const [catalog, own] = await Promise.all([loadCatalog(supabase, active.id), loadOwnProfile(supabase, userId, active.id)]);
  const { profile, game, roles, characters } = own;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Editar perfil</h1>
          <p className="text-muted">Ningún campo es obligatorio: complétalo a tu ritmo.</p>
        </div>
        <Link href={`/jugador/${userId}`} className="min-h-11 py-3 text-sm text-accent-soft underline underline-offset-4">
          Ver mi perfil público
        </Link>
      </div>
      <ProfileForm
        key={active.id}
        gameName={active.name}
        characterLabel={active.character_label}
        catalog={catalog}
        values={{
          display_name: profile.display_name,
          languages: profile.languages,
          availability: profile.availability,
          goals: profile.goals,
          voice: profile.voice,
          languages_visibility: profile.languages_visibility,
          availability_visibility: profile.availability_visibility,
          goals_visibility: profile.goals_visibility,
          voice_visibility: profile.voice_visibility,
          social_twitch: profile.social_twitch,
          social_youtube: profile.social_youtube,
          social_x: profile.social_x,
          socials_visibility: profile.socials_visibility,
          dm_policy: profile.dm_policy === "none" ? "none" : "registered",
          rank_id: game?.rank_id ?? null,
          region_id: game?.region_id ?? null,
          flex: game?.flex ?? false,
          game_visibility: game?.visibility ?? "registered",
          roles: roles.map((r) => r.role_id),
          modes: game?.mode_slugs ?? [],
          primary_role: roles.find((r) => r.is_primary)?.role_id ?? null,
          characters: Object.fromEntries(characters.map((c) => [c.character_id, c.status])),
        }}
      />
    </section>
  );
}
