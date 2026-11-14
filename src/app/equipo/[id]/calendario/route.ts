import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { APP_NAME } from "@/lib/config";
import { buildCalendar, calendarResponse } from "@/lib/ics";
import { siteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

// Las próximas quedadas del equipo en un archivo de calendario (solo miembros: la RLS no enseña las de otros equipos).
// Volver a importarlo actualiza las que ya estaban (mismo UID) y añade las nuevas.
export async function GET(_req: Request, { params }: RouteContext<"/equipo/[id]/calendario">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 404 });
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return new Response(null, { status: 401 });

  const [{ data: team }, { data: events }, t] = await Promise.all([
    supabase.from("teams").select("id, name").eq("id", id).maybeSingle(),
    supabase.from("team_events").select("id, starts_at, note").eq("team_id", id).gte("starts_at", new Date().toISOString()).order("starts_at").limit(50),
    getTranslations("calendar"),
  ]);
  if (!team || !events?.length) return new Response(null, { status: 404 });
  const url = `${siteUrl()}/equipo/${team.id}`;
  const body = buildCalendar(
    events.map((e) => ({
      uid: `team-event-${e.id}@teamfinder`,
      start: new Date(e.starts_at),
      minutes: 120,
      title: t("teamTitle", { team: team.name }),
      description: [e.note, t("teamDescription", { url })].filter(Boolean).join("\n\n"),
      url,
    })),
    { name: t("teamCalendar", { team: team.name }) },
  );
  return calendarResponse(body, `${APP_NAME}-${team.name}`);
}
