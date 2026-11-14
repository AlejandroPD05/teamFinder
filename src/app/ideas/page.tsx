import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { APP_NAME } from "@/lib/config";
import { catalogLang, INTL_LOCALE, OG_LOCALE } from "@/lib/i18n/locale";
import { groupIdeas, isVotable, type PublicIdea } from "@/lib/ideas";
import { createClient } from "@/lib/supabase/server";
import { DeleteIdea, IdeaEditor, VoteButton } from "./forms";

// Ideas de la comunidad (docs/PROMPT.md §7.2): las publica moderación, cualquiera las ve y con sesión se apoyan.
// Los textos los escribe moderación en español; en la versión inglesa se marcan con lang="es".

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("ideas"), getLocale()]);
  const title = t("metaTitle");
  const description = t("metaDescription", { app: APP_NAME });
  return {
    title,
    description,
    alternates: { canonical: "/ideas" },
    openGraph: { type: "website", siteName: APP_NAME, locale: OG_LOCALE[locale], title, description, url: "/ideas" },
  };
}

export default async function IdeasPage({ searchParams }: PageProps<"/ideas">) {
  const supabase = await createClient();
  const [{ data: claims }, { data }, t, locale] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.rpc("public_ideas"),
    getTranslations("ideas"),
    getLocale(),
  ]);
  const signedIn = Boolean(claims?.claims?.sub);
  const isAdmin = signedIn ? Boolean((await supabase.rpc("is_admin")).data) : false;
  const groups = groupIdeas((data ?? []) as PublicIdea[]);
  const lang = catalogLang(locale);
  const day = new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: "numeric", month: "short" });

  // Moderación: «Publicar como idea» desde una sugerencia del buzón (la RLS solo se la enseña a moderación).
  const from = z.uuid().safeParse((await searchParams).desde);
  const source =
    isAdmin && from.success ? (await supabase.from("feedback").select("id, body").eq("id", from.data).maybeSingle()).data : null;

  return (
    <article className="flex max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-bold leading-[1.1] sm:text-5xl">{t("title")}</h1>
        <p className="text-lg text-muted">{t("lead")}</p>
        <p className="text-sm text-muted">
          {t("suggestPrefix")}{" "}
          <Link href="/sugerencias?desde=/ideas" className="text-accent-soft underline underline-offset-4">
            {t("suggestLink")}
          </Link>
          {!signedIn && (
            <>
              {" · "}
              <Link href="/entrar?next=/ideas" className="text-accent-soft underline underline-offset-4">
                {t("signInToVote")}
              </Link>
            </>
          )}
        </p>
      </header>

      {isAdmin && (
        <section aria-labelledby="nueva-idea" className="surface flex flex-col gap-3 p-5">
          <h2 id="nueva-idea" className="font-semibold">
            {source ? t("fromFeedback") : t("newIdea")}
          </h2>
          {source && (
            <blockquote className="whitespace-pre-line border-l-2 border-line pl-3 text-sm text-muted">{source.body}</blockquote>
          )}
          <p className="text-sm text-muted">{t("adminHint")}</p>
          <IdeaEditor key={source?.id ?? "new"} feedbackId={source?.id} />
        </section>
      )}

      {groups.length === 0 ? (
        <p className="surface p-5 text-muted">{t("empty")}</p>
      ) : (
        groups.map((g) => {
          const list = (
            <ul className="flex flex-col gap-3">
              {g.ideas.map((idea) => (
                <li key={idea.id} id={`idea-${idea.id}`} className="surface flex gap-4 p-4">
                  {isVotable(idea.status) && signedIn ? (
                    <VoteButton id={idea.id} title={idea.title} votes={idea.votes} voted={idea.voted} />
                  ) : (
                    <p className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 self-start text-sm tabular-nums text-muted">
                      <span className="sr-only">{t("votesLabel", { count: idea.votes })}</span>
                      <span aria-hidden="true">▲ {idea.votes}</span>
                    </p>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h3 lang={lang} className="font-semibold">
                      {idea.title}
                    </h3>
                    {idea.body && (
                      <p lang={lang} className="whitespace-pre-line text-sm text-muted">
                        {idea.body}
                      </p>
                    )}
                    <p className="text-xs text-muted">{t("updated", { date: day.format(new Date(idea.updated_at)) })}</p>
                    {isAdmin && (
                      <details className="mt-2">
                        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm text-accent-soft">{t("edit")}</summary>
                        <div className="mt-2 flex flex-col gap-2">
                          <IdeaEditor idea={idea} />
                          <DeleteIdea id={idea.id} title={idea.title} />
                        </div>
                      </details>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          );
          return (
            <section key={g.status} aria-labelledby={`estado-${g.status}`} className="flex flex-col gap-3">
              <h2 id={`estado-${g.status}`} className="font-display text-xl font-semibold">
                {t(`status.${g.status}`)} <span className="text-base font-normal text-muted">({g.ideas.length})</span>
              </h2>
              {list}
            </section>
          );
        })
      )}
    </article>
  );
}
