import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FANART_STATUS } from "@/lib/fanart";
import { currentGame } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";
import { FanartForm, WithdrawFanart } from "./forms";

export const metadata: Metadata = { title: "Enviar fanart" };

const when = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", dateStyle: "medium" });

export default async function FanartPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/entrar?next=/coleccion/fanart");
  const [{ game, games }, { data: mine }] = await Promise.all([
    currentGame(),
    supabase
      .from("fanart_submissions")
      .select("id, game_id, title, status, review_note, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const gameName = (id: string) => games.find((g) => g.id === id)?.name ?? id;

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/coleccion" className="inline-flex min-h-11 items-center self-start text-sm text-muted hover:text-text">
          ← Colección
        </Link>
        <h1 className="font-display text-3xl font-semibold">Tu fanart como carta</h1>
        <p className="max-w-2xl text-muted">
          Si dibujas, puedes enviar tu obra. Moderación la revisa y, si se aprueba, pasa a ser una carta que se consigue con las
          misiones, con tu nombre en el crédito. Solo obras tuyas; sin marcas de agua ajenas ni arte oficial retocado.
        </p>
      </header>

      <FanartForm userId={userId} games={games.map((g) => ({ id: g.id, name: g.name }))} current={game.id} />

      <section aria-labelledby="mis-envios" className="flex flex-col gap-3">
        <h2 id="mis-envios" className="font-semibold">
          Tus envíos
        </h2>
        {!mine?.length ? (
          <p className="text-sm text-muted">Aún no has enviado ninguna obra.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {mine.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 surface p-4">
                <div>
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-sm text-muted">
                    {gameName(f.game_id)} · {when.format(new Date(f.created_at))} · {FANART_STATUS[f.status]}
                  </p>
                  {f.review_note && <p className="text-sm text-muted">Nota: {f.review_note}</p>}
                </div>
                {f.status !== "withdrawn" && <WithdrawFanart id={f.id} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
