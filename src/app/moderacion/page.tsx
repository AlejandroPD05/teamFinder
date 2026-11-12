import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { loadNames } from "@/lib/lobbies/queries";
import { REPORT_REASONS } from "@/lib/trust/options";
import { createClient } from "@/lib/supabase/server";
import { LiftRestrictionButton, ResolveForm, RestrictForm } from "../confianza/forms";
import { ReviewFanart } from "../coleccion/fanart/forms";

export const metadata: Metadata = { title: "Moderación", robots: { index: false } };

const when = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", dateStyle: "medium", timeStyle: "short" });

export default async function ModerationPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/entrar?next=/moderacion");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) notFound(); // no revelar que existe

  const { data: reports } = await supabase
    .from("reports")
    .select("id, target_user_id, reporter_id, reason, details, message_snapshot, lobby_id, clip_id, clip_comment_id, direct_message_id, created_at")
    .eq("status", "open")
    .order("created_at")
    .limit(100);
  const list = reports ?? [];
  const [{ data: restrictions }, { data: fanart }] = await Promise.all([
    supabase
      .from("user_restrictions")
      .select("id, user_id, until, reason")
      .is("lifted_at", null)
      .gt("until", new Date().toISOString())
      .order("until"),
    supabase
      .from("fanart_submissions")
      .select("id, user_id, game_id, title, artist_name, portfolio_url, image_path, created_at")
      .eq("status", "pending")
      .order("created_at")
      .limit(50),
  ]);
  const names = await loadNames(supabase, [
    ...(list.map((r) => r.target_user_id).filter(Boolean) as string[]),
    ...(restrictions ?? []).map((r) => r.user_id),
    ...(fanart ?? []).map((f) => f.user_id),
  ]);
  const fanartUrl = (path: string) => supabase.storage.from("fanart").getPublicUrl(path).data.publicUrl;

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Moderación</h1>
        <p className="text-muted">Denuncias abiertas, más antiguas primero. Cada resolución queda registrada.</p>
      </div>
      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-center text-muted">No hay denuncias abiertas.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {list.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 surface p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">{REPORT_REASONS[r.reason]}</h2>
                <span className="text-xs text-muted">{when.format(new Date(r.created_at))}</span>
              </div>
              <p className="text-sm">
                Denunciado:{" "}
                {r.target_user_id ? (
                  <Link href={`/jugador/${r.target_user_id}`} className="underline underline-offset-4">
                    {names.get(r.target_user_id)?.name ?? "Jugador"}
                  </Link>
                ) : (
                  <span className="text-muted">cuenta borrada</span>
                )}
                {r.clip_id && (
                  <>
                    {" "}
                    · en{" "}
                    <Link href={`/clips/${r.clip_id}`} className="underline underline-offset-4">
                      {r.clip_comment_id ? "un comentario de un clip" : "un clip"}
                    </Link>{" "}
                    (allí se puede ocultar)
                  </>
                )}
                {r.lobby_id && (
                  <>
                    {" "}
                    · en{" "}
                    <Link href={`/grupos/${r.lobby_id}`} className="underline underline-offset-4">
                      un grupo
                    </Link>
                  </>
                )}
              </p>
              {r.message_snapshot && (
                <blockquote className="rounded border-l-2 border-danger bg-bg px-3 py-2 text-sm">«{r.message_snapshot}»</blockquote>
              )}
              {r.details && <p className="text-sm text-muted">Detalles: {r.details}</p>}
              {r.direct_message_id && <p className="text-xs text-muted">En un mensaje privado (copia arriba).</p>}
              {r.target_user_id && <RestrictForm userId={r.target_user_id} reportId={r.id} />}
              <ResolveForm reportId={r.id} />
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="restricciones" className="flex flex-col gap-3">
        <h2 id="restricciones" className="font-display text-xl font-semibold">
          Restricciones activas
        </h2>
        {!restrictions?.length ? (
          <p className="text-sm text-muted">Nadie está restringido ahora mismo.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {restrictions.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 surface p-4">
                <div className="text-sm">
                  <Link href={`/jugador/${r.user_id}`} className="font-semibold underline underline-offset-4">
                    {names.get(r.user_id)?.name ?? "Jugador"}
                  </Link>{" "}
                  hasta el {when.format(new Date(r.until))}
                  <p className="text-muted">Motivo: {r.reason}</p>
                </div>
                <LiftRestrictionButton restrictionId={r.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="fanart" className="flex flex-col gap-3">
        <h2 id="fanart" className="font-display text-xl font-semibold">
          Fanart pendiente
        </h2>
        {!fanart?.length ? (
          <p className="text-sm text-muted">No hay obras pendientes.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {fanart.map((f) => (
              <li key={f.id} className="grid gap-4 surface p-5 sm:grid-cols-[10rem_1fr]">
                {/* eslint-disable-next-line @next/next/no-img-element -- vista previa sin optimizar de una subida pendiente */}
                <img src={fanartUrl(f.image_path)} alt={`Fanart «${f.title}»`} className="aspect-[3/4] w-40 rounded-md object-cover" />
                <div className="flex flex-col gap-2">
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-sm text-muted">
                    {f.game_id} · de {f.artist_name} (cuenta:{" "}
                    <Link href={`/jugador/${f.user_id}`} className="underline underline-offset-4">
                      {names.get(f.user_id)?.name ?? "Jugador"}
                    </Link>
                    ) · {when.format(new Date(f.created_at))}
                  </p>
                  {f.portfolio_url && (
                    <a href={f.portfolio_url} rel="noopener noreferrer nofollow" target="_blank" className="text-sm underline underline-offset-4">
                      Portfolio
                    </a>
                  )}
                  <p className="text-xs text-muted">Comprueba que no es arte oficial ni de otra persona (búsqueda inversa de imagen).</p>
                  <ReviewFanart id={f.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
