import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loadEmblems } from "@/lib/clips/queries";
import { currentGame } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";
import { PostClipForm } from "../components";

export const metadata: Metadata = { title: "Publicar clip" };

export default async function NewClipPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/entrar?next=/clips/nuevo");
  const [{ game }, emblems] = await Promise.all([currentGame(), loadEmblems(supabase)]);

  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <Link href="/clips" className="text-sm text-muted underline underline-offset-4 hover:text-text">
        Volver a los clips
      </Link>
      <h1 className="font-display text-3xl font-semibold">Publicar clip de {game.name}</h1>
      <PostClipForm emblems={emblems} gameName={game.name} />
    </section>
  );
}
