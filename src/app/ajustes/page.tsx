import { getTranslations } from "next-intl/server";
import { titled } from "@/lib/i18n/metadata";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loadNames } from "@/lib/lobbies/queries";
import { createClient } from "@/lib/supabase/server";
import { BlockButton, DeleteAccountForm } from "../confianza/forms";
import { EmailNotificationsForm } from "./email-form";
import { PushSettings } from "./push-settings";

export const generateMetadata = titled("settings");

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/entrar?next=/ajustes");

  const [{ data: blocks }, { data: me }] = await Promise.all([
    supabase.from("user_blocks").select("blocked_id, created_at").order("created_at", { ascending: false }),
    supabase.from("profiles").select("email_notifications").eq("id", claims.claims.sub).single(),
  ]);
  const names = await loadNames(supabase, (blocks ?? []).map((b) => b.blocked_id));
  const t = await getTranslations("settings");

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted">
          {t.rich("lead", {
            edit: (c) => (
              <Link href="/perfil/editar" className="text-accent-soft underline underline-offset-4">
                {c}
              </Link>
            ),
          })}
        </p>
      </div>

      <section aria-labelledby="push" className="surface flex flex-col items-start gap-3 p-5">
        <h2 id="push" className="font-semibold">
          {t("pushTitle")}
        </h2>
        <p className="text-sm text-muted">{t("pushText")}</p>
        <PushSettings />
      </section>

      <section aria-labelledby="correo" className="surface flex flex-col items-start gap-3 p-5">
        <h2 id="correo" className="font-semibold">
          {t("emailTitle")}
        </h2>
        <p className="text-sm text-muted">{t("emailText")}</p>
        <EmailNotificationsForm enabled={me?.email_notifications ?? false} />
      </section>

      <section aria-labelledby="datos" className="surface flex flex-col items-start gap-3 p-5">
        <h2 id="datos" className="font-semibold">
          {t("dataTitle")}
        </h2>
        <p className="text-sm text-muted">{t("dataText")}</p>
        <a href="/ajustes/mis-datos" download className="btn-ghost">
          {t("download")}
        </a>
      </section>

      <section aria-labelledby="bloqueados" className="surface p-5">
        <h2 id="bloqueados" className="font-semibold">
          {t("blockedTitle")}
        </h2>
        {(blocks ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t("noBlocked")}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {blocks!.map((b) => {
              const n = names.get(b.blocked_id)?.name ?? t("player");
              return (
                <li key={b.blocked_id} className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/jugador/${b.blocked_id}`} className="underline underline-offset-4">
                    {n}
                  </Link>
                  <BlockButton userId={b.blocked_id} blocked name={n} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="borrar" className="rounded-lg border border-danger bg-panel p-5">
        <h2 id="borrar" className="font-semibold">
          {t("deleteTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted">{t("deleteText")}</p>
        <div className="mt-4">
          <DeleteAccountForm />
        </div>
      </section>
    </section>
  );
}
