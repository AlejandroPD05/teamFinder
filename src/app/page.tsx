import Link from "next/link";
import { es } from "@/lib/i18n/es";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 py-10 text-center sm:py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">{es.home.title}</h1>
      <p className="text-lg text-muted">{es.home.lead}</p>
      <div>
        <Link
          href={signedIn ? "/buscar" : "/entrar"}
          className="inline-flex min-h-11 items-center rounded-md bg-accent px-6 font-semibold text-bg hover:bg-accent-soft"
        >
          {signedIn ? es.home.ctaSignedIn : es.home.cta}
        </Link>
      </div>
      <p className="text-sm text-muted">{es.home.beta}</p>
    </section>
  );
}
