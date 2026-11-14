import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { safeNextPath } from "@/lib/auth";
import { APP_NAME, emailLoginEnabled } from "@/lib/config";
import { titled } from "@/lib/i18n/metadata";
import { errorKey } from "@/lib/i18n/translator";
import { signInWithDiscord, signInWithEmail } from "./actions";

export const generateMetadata = titled("login", { robots: { index: false } });

export default async function LoginPage({ searchParams }: PageProps<"/entrar">) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const next = safeNextPath(one(params.next));
  const code = one(params.error);
  const [t, te] = await Promise.all([getTranslations("login"), getTranslations("errors")]);
  const error = code ? te(errorKey("login", code) as never) : null;
  const sent = one(params.sent) === "1";
  const link = (chunks: React.ReactNode, href: string) => (
    <Link href={href} className="text-accent-soft underline underline-offset-4">
      {chunks}
    </Link>
  );

  return (
    <section className="mx-auto flex max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold">{t("title", { app: APP_NAME })}</h1>
        <p className="text-muted">{emailLoginEnabled() ? t("lead") : t("leadDiscordOnly")}</p>
        <p className="text-sm text-muted">
          {t.rich("terms", { rules: (c) => link(c, "/normas"), privacy: (c) => link(c, "/privacidad") })}
        </p>
      </div>

      {error && (
        <p id="login-error" role="alert" className="rounded-md border border-danger bg-panel p-3 text-sm text-danger">
          {error}
        </p>
      )}
      {sent && (
        <p role="status" className="rounded-md border border-success bg-panel p-3 text-sm text-success">
          {t("sent")}
        </p>
      )}

      <form action={signInWithDiscord}>
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="btn-primary w-full"
        >
          {t("discord")}
        </button>
      </form>

      {emailLoginEnabled() ? (
        <>
      <div className="flex items-center gap-3 text-sm text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        {t("or")}
        <span className="h-px flex-1 bg-line" />
      </div>

      <form action={signInWithEmail} className="flex flex-col gap-3" noValidate>
        <input type="hidden" name="next" value={next} />
        <label htmlFor="email" className="text-sm font-medium">
          {t("emailLabel")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          // Con el correo mal escrito, el lector de pantalla lee el error al volver al campo.
          aria-describedby={code === "invalid_email" ? "login-error email-hint" : "email-hint"}
          aria-invalid={code === "invalid_email" || undefined}
          className="min-h-11 rounded-md border border-line bg-panel px-3 text-text placeholder:text-muted focus:border-accent"
        />
        <p id="email-hint" className="text-sm text-muted">
          {t("emailHint")}
        </p>
        <button
          type="submit"
          className="btn-ghost"
        >
          {t("emailSubmit")}
        </button>
      </form>
        </>
      ) : (
        <p className="text-sm text-muted">{t("emailOff")}</p>
      )}
    </section>
  );
}
