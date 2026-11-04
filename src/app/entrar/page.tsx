import type { Metadata } from "next";
import Link from "next/link";
import { safeNextPath } from "@/lib/auth";
import { emailLoginEnabled } from "@/lib/config";
import { es, loginError } from "@/lib/i18n/es";
import { signInWithDiscord, signInWithEmail } from "./actions";

export const metadata: Metadata = { title: es.nav.login };

export default async function LoginPage({ searchParams }: PageProps<"/entrar">) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const next = safeNextPath(one(params.next));
  const error = loginError(one(params.error));
  const sent = one(params.sent) === "1";

  return (
    <section className="mx-auto flex max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{es.login.title}</h1>
        <p className="text-muted">{emailLoginEnabled() ? es.login.lead : es.login.leadDiscordOnly}</p>
        <p className="text-sm text-muted">
          Antes de entrar, lee las{" "}
          <Link href="/normas" className="text-accent-soft underline underline-offset-4">
            normas
          </Link>{" "}
          y la{" "}
          <Link href="/privacidad" className="text-accent-soft underline underline-offset-4">
            privacidad
          </Link>
          .
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-danger/40 bg-panel p-3 text-sm text-danger">
          {error}
        </p>
      )}
      {sent && (
        <p role="status" className="rounded-md border border-success/40 bg-panel p-3 text-sm text-success">
          {es.login.sent}
        </p>
      )}

      <form action={signInWithDiscord}>
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="min-h-11 w-full rounded-md bg-accent px-4 font-semibold text-bg hover:bg-accent-soft"
        >
          {es.login.discord}
        </button>
      </form>

      {emailLoginEnabled() ? (
        <>
      <div className="flex items-center gap-3 text-sm text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        {es.login.or}
        <span className="h-px flex-1 bg-line" />
      </div>

      <form action={signInWithEmail} className="flex flex-col gap-3" noValidate>
        <input type="hidden" name="next" value={next} />
        <label htmlFor="email" className="text-sm font-medium">
          {es.login.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          aria-describedby="email-hint"
          aria-invalid={error === es.login.errors.invalid_email || undefined}
          className="min-h-11 rounded-md border border-line bg-panel px-3 text-text placeholder:text-muted focus:border-accent"
        />
        <p id="email-hint" className="text-sm text-muted">
          {es.login.emailHint}
        </p>
        <button
          type="submit"
          className="min-h-11 rounded-md border border-line px-4 font-medium hover:bg-panel-hover"
        >
          {es.login.emailSubmit}
        </button>
      </form>
        </>
      ) : (
        <p className="text-sm text-muted">{es.login.emailOff}</p>
      )}
    </section>
  );
}
