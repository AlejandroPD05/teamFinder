import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { APP_NAME } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { AcceptInvite } from "./accept";
import { inviteCode } from "@/lib/invite";

async function owner(code: string) {
  if (!inviteCode.safeParse(code).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("invite_owner", { p_code: code });
  return data ?? null;
}

export async function generateMetadata({ params }: PageProps<"/invitar/[code]">): Promise<Metadata> {
  const { code } = await params;
  const [name, t] = await Promise.all([owner(code), getTranslations("invite")]);
  return {
    title: name ? t("pageTitle", { name, app: APP_NAME }) : t("invalid"),
    description: t("pageLead", { app: APP_NAME }),
    robots: { index: false, follow: false },
  };
}

/** Página pública de un enlace de invitación: quién invita, qué es la web y cómo entrar. */
export default async function InvitePage({ params }: PageProps<"/invitar/[code]">) {
  const { code } = await params;
  const name = await owner(code);
  if (!name) notFound();
  const supabase = await createClient();
  const [{ data: claims }, t] = await Promise.all([supabase.auth.getClaims(), getTranslations("invite")]);
  const signedIn = Boolean(claims?.claims?.sub);
  return (
    <article className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="kicker">{APP_NAME}</p>
        <h1 className="font-display text-3xl font-semibold">{t("pageTitle", { name, app: APP_NAME })}</h1>
        <p className="text-muted">{t("pageLead", { app: APP_NAME })}</p>
      </header>
      {signedIn ? (
        <AcceptInvite code={code} />
      ) : (
        <Link href={`/entrar?next=/invitar/${code}`} className="btn-primary self-start">
          {t("signIn")}
        </Link>
      )}
      <p className="text-xs text-muted">{t("pageNote")}</p>
    </article>
  );
}
