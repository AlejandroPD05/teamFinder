import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { loadNames } from "@/lib/lobbies/queries";
import { REPORT_REASONS } from "@/lib/trust/options";
import { createClient } from "@/lib/supabase/server";
import { ResolveForm } from "../confianza/forms";

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
    .select("id, target_user_id, reporter_id, reason, details, message_snapshot, lobby_id, created_at")
    .eq("status", "open")
    .order("created_at")
    .limit(100);
  const list = reports ?? [];
  const names = await loadNames(supabase, list.map((r) => r.target_user_id).filter(Boolean) as string[]);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Moderación</h1>
        <p className="text-muted">Denuncias abiertas, más antiguas primero. Cada resolución queda registrada.</p>
      </div>
      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-6 text-center text-muted">No hay denuncias abiertas.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {list.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">{REPORT_REASONS[r.reason]}</h2>
                <span className="text-xs text-muted">{when.format(new Date(r.created_at))}</span>
              </div>
              <p className="text-sm">
                Denunciado:{" "}
                {r.target_user_id ? (
                  <Link href={`/jugador/${r.target_user_id}`} className="underline-offset-4 hover:underline">
                    {names.get(r.target_user_id)?.name ?? "Jugador"}
                  </Link>
                ) : (
                  <span className="text-muted">cuenta borrada</span>
                )}
                {r.lobby_id && (
                  <>
                    {" "}
                    · en{" "}
                    <Link href={`/grupos/${r.lobby_id}`} className="underline-offset-4 hover:underline">
                      un grupo
                    </Link>
                  </>
                )}
              </p>
              {r.message_snapshot && (
                <blockquote className="rounded border-l-2 border-danger/60 bg-bg px-3 py-2 text-sm">«{r.message_snapshot}»</blockquote>
              )}
              {r.details && <p className="text-sm text-muted">Detalles: {r.details}</p>}
              <ResolveForm reportId={r.id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
