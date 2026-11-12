import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loadNames } from "@/lib/lobbies/queries";
import { createClient } from "@/lib/supabase/server";
import { BlockButton, DeleteAccountForm } from "../confianza/forms";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/entrar?next=/ajustes");

  const { data: blocks } = await supabase.from("user_blocks").select("blocked_id, created_at").order("created_at", { ascending: false });
  const names = await loadNames(supabase, (blocks ?? []).map((b) => b.blocked_id));

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Ajustes</h1>
        <p className="text-muted">
          La visibilidad de cada dato se cambia en{" "}
          <Link href="/perfil/editar" className="text-accent-soft underline underline-offset-4">
            Editar perfil
          </Link>
          .
        </p>
      </div>

      <section aria-labelledby="datos" className="surface flex flex-col items-start gap-3 p-5">
        <h2 id="datos" className="font-semibold">
          Tus datos
        </h2>
        <p className="text-sm text-muted">
          Descarga en un archivo JSON todo lo que has aportado: perfil, grupos, mensajes, clips, comentarios, cartas, bloqueos
          y denuncias que has hecho.
        </p>
        <a href="/ajustes/mis-datos" download className="btn-ghost">
          Descargar mis datos
        </a>
      </section>

      <section aria-labelledby="bloqueados" className="surface p-5">
        <h2 id="bloqueados" className="font-semibold">
          Jugadores bloqueados
        </h2>
        {(blocks ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted">No has bloqueado a nadie.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {blocks!.map((b) => {
              const n = names.get(b.blocked_id)?.name ?? "Jugador";
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
          Borrar mi cuenta
        </h2>
        <p className="mt-2 text-sm text-muted">
          Se borran para siempre tu perfil, tus datos de juego, tus grupos, tus mensajes y tus valoraciones. Las denuncias
          que hayas hecho se conservan sin tu identidad para que moderación pueda revisarlas. No se puede deshacer.
        </p>
        <div className="mt-4">
          <DeleteAccountForm />
        </div>
      </section>
    </section>
  );
}
