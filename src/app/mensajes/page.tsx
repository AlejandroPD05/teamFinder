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

  const [{ data: rooms }, { data: convs }, catalog] = await Promise.all([
    supabase.rpc("my_rooms"),
    supabase.rpc("my_conversations"),
    loadCatalog(supabase),
  ]);
  const list = rooms ?? [];
  const dms = (convs ?? []).filter((c) => !c.blocked);
  const names = await loadNames(supabase, [
    ...list.flatMap((r) => [r.owner_id, r.last_user_id].filter(Boolean) as string[]),
    ...dms.map((c) => c.other_id),
  ]);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Mensajes</h1>
        <p className="text-muted">Conversaciones privadas y salas de los grupos en los que estás.</p>
      </div>

      <section aria-labelledby="privados" className="flex flex-col gap-3">
        <h2 id="privados" className="font-semibold">
          Privados
        </h2>
        {dms.length === 0 ? (
          <p className="text-sm text-muted">
            Aún no tienes conversaciones privadas. Abre el perfil de un jugador y pulsa «Enviar mensaje».
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {dms.map((c) => (
              <li key={c.conversation_id}>
                <Link href={`/mensajes/${c.conversation_id}`} className="flex items-center gap-4 surface p-4 hover:bg-panel-hover">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{names.get(c.other_id)?.name ?? "Jugador"}</p>
                    <p className="truncate text-sm text-muted">
                      {c.last_sender === me ? "Tú: " : ""}
                      {c.last_body}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {c.last_at && <span className="text-xs text-muted">{when.format(new Date(c.last_at))}</span>}
                    {Number(c.unread) > 0 && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-bg">
                        {c.unread} <span className="sr-only">sin leer</span>
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <h2 className="font-semibold">Salas de grupo</h2>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-6 text-center">
          <h3 className="font-semibold">No estás en ningún grupo activo</h3>
          <p className="mt-1 text-sm text-muted">Únete a un grupo o crea uno para chatear con tu stack.</p>
          <Link href="/grupos" className="mt-3 btn-ghost">
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
                  className="flex items-center gap-4 surface p-4 hover:bg-panel-hover"
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
