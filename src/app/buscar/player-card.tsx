import { Clock3, Languages, Mic } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CharacterIcon, RankBadge, RoleIcon } from "@/components/game-icons";
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

export function PlayerCard({ p, catalog, profileHref }: { p: PlayerRow; catalog: Catalog; profileHref?: string | null }) {
  const name = p.display_name ?? "Jugador";
  const rank = catalog.ranks.find((r) => r.id === p.rank_id);
  const region = catalog.regions.find((r) => r.id === p.region_id)?.name;
  const role = (id: string) => catalog.roles.find((r) => r.id === id);
  const roles = [...(p.role_ids ?? [])].sort((a, b) => Number(b === p.primary_role_id) - Number(a === p.primary_role_id));
  const agents = (p.char_keys ?? [])
    .map((k) => {
      const [id, status] = k.split(":");
      return { c: catalog.characters.find((x) => x.id === id), status: status as (typeof STATUS_ORDER)[number] };
    })
    .filter((a) => a.c)
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
    .slice(0, 5);
  const modes = (p.mode_slugs ?? []).map((s) => catalog.modes.find((m) => m.slug === s)?.name ?? s);
  const langs = (p.languages ?? []).map((l) => LANGUAGES[l as keyof typeof LANGUAGES] ?? l);
  const goals = (p.goals ?? []).map((g) => GOALS[g as keyof typeof GOALS] ?? g);

  return (
    <li className="surface surface-interactive flex flex-col gap-4 p-4">
      <div className="flex items-start gap-3">
        {p.avatar_url ? (
          <Image src={p.avatar_url} alt="" width={48} height={48} className="rounded-full ring-1 ring-line" />
        ) : (
          <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-bg-raised font-display text-lg font-semibold ring-1 ring-line">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-display truncate text-lg font-semibold">{name}</h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm">
            {rank ? <RankBadge name={rank.name} src={rank.icon_url} color={rank.color} size={20} /> : <span className="text-muted">Rango sin indicar</span>}
            {region && <span className="text-muted">· {region}</span>}
          </div>
        </div>
        {p.flex && <span className="chip border-info/50 text-info-soft">Flex</span>}
      </div>

      {roles.length > 0 && (
        <ul aria-label="Roles" className="flex flex-wrap gap-1.5">
          {roles.map((id) => {
            const r = role(id);
            return (
              <li key={id} className={`chip ${id === p.primary_role_id ? "border-accent/60 bg-accent/10" : ""}`}>
                <RoleIcon slug={r?.slug} className="size-3.5 text-accent-soft" />
                {r?.name}
                {id === p.primary_role_id && <span className="sr-only"> (principal)</span>}
              </li>
            );
          })}
        </ul>
      )}

      {agents.length > 0 ? (
        <ul aria-label="Agentes" className="flex flex-wrap gap-2">
          {agents.map(({ c, status }) => (
            <li key={c!.id} className="flex flex-col items-center gap-1">
              <CharacterIcon name={c!.name} src={c!.icon_url} size={40} ring={status === "main" ? "main" : status === "comfort" ? "comfort" : null} />
              <span className="text-[0.65rem] leading-none text-muted">
                {c!.name}
                <span className="sr-only"> ({CHARACTER_STATUS[status]})</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Sin agentes indicados</p>
      )}

      <dl className="grid gap-1.5 text-sm">
        {modes.length > 0 && (
          <div className="flex items-center gap-2">
            <dt className="sr-only">Modos</dt>
            <dd className="flex flex-wrap gap-1.5">
              {modes.map((m) => (
                <span key={m} className="chip">
                  {m}
                </span>
              ))}
            </dd>
          </div>
        )}
        {(langs.length > 0 || goals.length > 0) && (
          <div className="flex items-start gap-2 text-muted">
            <dt>
              <Languages aria-hidden="true" className="mt-0.5 size-4" />
              <span className="sr-only">Idiomas y objetivos</span>
            </dt>
            <dd>{[...langs, ...goals].join(" · ")}</dd>
          </div>
        )}
        {p.voice && (
          <div className="flex items-center gap-2 text-muted">
            <dt>
              <Mic aria-hidden="true" className="size-4" />
              <span className="sr-only">Comunicación</span>
            </dt>
            <dd>{VOICE[p.voice as keyof typeof VOICE]}</dd>
          </div>
        )}
      </dl>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Clock3 aria-hidden="true" className="size-3.5" />
          Actualizado {ago(p.updated_at)}
        </span>
        {profileHref !== null && (
          <Link href={profileHref ?? `/jugador/${p.user_id}`} className="btn-ghost" aria-label={`Ver perfil de ${name}`}>
            Ver perfil
          </Link>
        )}
      </div>
    </li>
  );
}
