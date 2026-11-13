import { getTranslations } from "next-intl/server";
import { titled } from "@/lib/i18n/metadata";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loadEmblems } from "@/lib/clips/queries";
import { currentGame } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";
import { PostClipForm } from "../components";

export const generateMetadata = titled("newClip");

export default async function NewClipPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/entrar?next=/clips/nuevo");
  const [{ game }, emblems, t] = await Promise.all([currentGame(), loadEmblems(supabase), getTranslations("clips")]);

  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <Link href="/clips" className="text-sm text-muted underline underline-offset-4 hover:text-text">
        {t("back")}
      </Link>
      <h1 className="font-display text-3xl font-semibold">{t("postTitle", { game: game.name })}</h1>
      <PostClipForm emblems={emblems} gameName={game.name} />
    </section>
  );
}
