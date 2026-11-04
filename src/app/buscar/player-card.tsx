import Image from "next/image";
import Link from "next/link";
import { CHARACTER_STATUS, GOALS, LANGUAGES, VOICE } from "@/lib/profile/options";
import type { Catalog } from "@/lib/profile/queries";
import type { PlayerRow } from "@/lib/search/query";

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
function ago(iso: string | null) {
  if (!iso) return "";
  const days = Math.round((Date.parse(iso) - Date.now()) / 86_400_000);
  if (days > -1) return "hoy";
  if (days > -30) return rtf.format(days, "day");
  return rtf.format(Math.round(days / 30), "month");
}

const STATUS_ORDER = ["main", "comfort", "playable", "flexible"] as const;

export function PlayerCard({ p, catalog }: { p: PlayerRow; catalog: Catalog }) {
  const name = p.display_name ?? "Jugador";
  const rank = catalog.ranks.find((r) => r.id === p.rank_id)?.name;
  const region = catalog.regions.find((r) => r.id === p.region_id)?.name;
  const roleName = (id: string) => catalog.roles.find((r) => r.id === id)?.name ?? "";
  const roles = [...(p.role_ids ?? [])].sort((a, b) => Number(b === p.primary_role_id) - Number(a === p.primary_role_id));
  const agents = (p.char_keys ?? [])
    .map((k) => {
      const [id, status] = k.split(":");
      return { name: catalog.characters.find((c) => c.id === id)?.name, status: status as (typeof STATUS_ORDER)[number] };
    })
    .filter((a) => a.name)
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
    .slice(0, 4);
  const modes = (p.mode_slugs ?? []).map((s) => catalog.modes.find((m) => m.slug === s)?.name ?? s);

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-4">
      <div className="flex items-center gap-3">
        {p.avatar_url ? (
          <Image src={p.avatar_url} alt="" width={44} height={44} className="rounded-full" />
        ) : (
          <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full bg-bg font-semibold">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{name}</h2>
          <p className="text-sm text-muted">
            {rank ? `${rank} · manual` : "Rango sin indicar"}
            {region ? ` · ${region}` : ""}
          </p>
        </div>
        {p.flex && <span className="rounded border border-info/50 px-2 py-0.5 text-xs text-info-soft">Flex</span>}
      </div>

      <dl className="grid gap-1 text-sm">
        <div className="flex gap-2">
          <dt className="text-muted">Roles:</dt>
          <dd>
            {roles.length
              ? roles.map((id) => `${roleName(id)}${id === p.primary_role_id ? " (principal)" : ""}`).join(", ")
              : "—"}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted">Agentes:</dt>
          <dd>{agents.length ? agents.map((a) => `${a.name} (${CHARACTER_STATUS[a.status]})`).join(", ") : "—"}</dd>
        </div>
        {modes.length > 0 && (
          <div className="flex gap-2">
            <dt className="text-muted">Modos:</dt>
            <dd>{modes.join(", ")}</dd>
          </div>
        )}
        {(p.languages?.length || p.goals?.length || p.voice) && (
          <div className="flex gap-2">
            <dt className="text-muted">Estilo:</dt>
            <dd>
              {[
                ...(p.languages ?? []).map((l) => LANGUAGES[l as keyof typeof LANGUAGES] ?? l),
                ...(p.goals ?? []).map((g) => GOALS[g as keyof typeof GOALS] ?? g),
                p.voice ? VOICE[p.voice as keyof typeof VOICE] : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <span className="text-xs text-muted">Perfil actualizado {ago(p.updated_at)}</span>
        <Link
          href={`/jugador/${p.user_id}`}
          className="inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm hover:bg-panel-hover"
          aria-label={`Ver perfil de ${name}`}
        >
          Ver perfil
        </Link>
      </div>
    </li>
  );
}
