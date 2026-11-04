import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loadNames } from "@/lib/lobbies/queries";
import { loadCatalog } from "@/lib/profile/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mensajes" };

const when = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const me = claims?.claims?.sub;
  if (!me) redirect("/entrar?next=/mensajes");

  const [{ data: rooms }, catalog] = await Promise.all([supabase.rpc("my_rooms"), loadCatalog(supabase)]);
  const list = rooms ?? [];
  const names = await loadNames(supabase, list.flatMap((r) => [r.owner_id, r.last_user_id].filter(Boolean) as string[]));

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mensajes</h1>
        <p className="text-muted">Salas de los grupos en los que estás. Los mensajes privados entre jugadores llegarán más adelante.</p>
      </div>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-6 text-center">
          <h2 className="font-semibold">No estás en ningún grupo activo</h2>
          <p className="mt-1 text-sm text-muted">Únete a un grupo o crea uno para chatear con tu stack.</p>
          <Link href="/grupos" className="mt-3 inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm hover:bg-panel-hover">
            Ver grupos
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((r) => {
            const mode = catalog.modes.find((m) => m.slug === r.mode_slug)?.name ?? r.mode_slug;
            const owner = names.get(r.owner_id)?.name ?? "Jugador";
            const who = r.last_user_id === me ? "Tú" : (names.get(r.last_user_id ?? "")?.name ?? "Jugador");
            return (
              <li key={r.lobby_id}>
                <Link
                  href={`/grupos/${r.lobby_id}`}
                  className="flex items-center gap-4 rounded-lg border border-line bg-panel p-4 hover:bg-panel-hover"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {mode} de {r.owner_id === me ? "ti" : owner}
                      {r.status === "full" && <span className="ml-2 text-xs font-normal text-muted">completo</span>}
                    </p>
                    <p className="truncate text-sm text-muted">{r.last_body ? `${who}: ${r.last_body}` : "Sin mensajes todavía"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {r.last_at && <span className="text-xs text-muted">{when.format(new Date(r.last_at))}</span>}
                    {Number(r.unread) > 0 && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-bg">
                        {r.unread} <span className="sr-only">sin leer</span>
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
