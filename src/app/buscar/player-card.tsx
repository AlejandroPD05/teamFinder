import { Clock3, Languages, Mic } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { CharacterIcon, RankBadge, RoleIcon } from "@/components/game-icons";
import { INTL_LOCALE, type AppLocale } from "@/lib/i18n/locale";
import type { Catalog } from "@/lib/profile/queries";
import type { PlayerRow } from "@/lib/search/query";

function ago(iso: string | null, locale: AppLocale, today: string) {
  if (!iso) return "";
  const rtf = new Intl.RelativeTimeFormat(INTL_LOCALE[locale], { numeric: "auto" });
  const days = Math.round((Date.parse(iso) - Date.now()) / 86_400_000);
  if (days > -1) return today;
  if (days > -30) return rtf.format(days, "day");
  return rtf.format(Math.round(days / 30), "month");
}

const STATUS_ORDER = ["main", "comfort", "playable", "flexible"] as const;

export function PlayerCard({
  p,
  catalog,
  profileHref,
  characterLabel = "Agentes",
  index = 0,
  available = null,
}: {
  p: PlayerRow;
  catalog: Catalog;
  profileHref?: string | null;
  characterLabel?: string | null;
  /** Posición en la lista, para escalonar la entrada. */
  index?: number;
  /** Si se ha marcado «disponible ahora» (hasta cuándo y en qué modo). */
  available?: { available_until: string; mode_slug: string | null } | null;
}) {
  const t = useTranslations("playerCard");
  const to = useTranslations("options");
  const locale = useLocale();
  const untilFmt = new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });
  const opt = (group: "languages" | "goals" | "voice", v: string) => (to.has(`${group}.${v}` as never) ? to(`${group}.${v}` as never) : v);
  const name = p.display_name ?? t("player");
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
  const langs = (p.languages ?? []).map((l) => opt("languages", l));
  const goals = (p.goals ?? []).map((g) => opt("goals", g));

  return (
    <li className="surface surface-interactive spotlight enter flex flex-col gap-4 p-4" style={{ "--i": index } as CSSProperties}>
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
            {rank ? <RankBadge name={rank.name} src={rank.icon_url} color={rank.color} size={20} /> : <span className="text-muted">{t("noRank")}</span>}
            {region && <span className="text-muted">· {region}</span>}
          </div>
        </div>
        {p.flex && <span className="text-sm font-medium text-info-soft">Flex</span>}
      </div>
      {available && (
        <p className="flex items-center gap-2 text-sm font-medium text-success">
          <span aria-hidden="true" className="live-dot" />
          {t("availableNow")}
          {available.mode_slug && (
            <span className="font-normal text-muted">· {catalog.modes.find((m) => m.slug === available.mode_slug)?.name ?? available.mode_slug}</span>
          )}
          <span className="font-normal text-muted">· {t("until", { time: untilFmt.format(new Date(available.available_until)) })}</span>
        </p>
      )}

      {roles.length > 0 && (
        <ul aria-label={t("roles")} className="flex flex-wrap gap-1.5">
          {roles.map((id) => {
            const r = role(id);
            return (
              <li key={id} className={`chip ${id === p.primary_role_id ? "font-semibold" : "text-muted"}`}>
                <RoleIcon slug={r?.slug} className="size-3.5 text-muted" />
                {r?.name}
                {id === p.primary_role_id && <span className="sr-only"> {t("primary")}</span>}
              </li>
            );
          })}
        </ul>
      )}

      {agents.length > 0 ? (
        <ul aria-label={characterLabel ?? t("characters")} className="flex flex-wrap gap-2">
          {agents.map(({ c, status }) => (
            <li key={c!.id} className="flex flex-col items-center gap-1">
              <CharacterIcon name={c!.name} src={c!.icon_url} size={40} ring={status === "main" ? "main" : status === "comfort" ? "comfort" : null} />
              <span className="text-[0.65rem] leading-none text-muted">
                {c!.name}
                <span className="sr-only"> ({to(`characterStatus.${status}`)})</span>
              </span>
            </li>
          ))}
        </ul>
      ) : characterLabel ? (
        <p className="text-sm text-muted">{t("noCharacters", { label: characterLabel.toLowerCase() })}</p>
      ) : null}

      <dl className="grid gap-1.5 text-sm">
        {modes.length > 0 && (
          <div className="flex items-center gap-2">
            <dt className="sr-only">{t("modes")}</dt>
            <dd>{modes.join(" · ")}</dd>
          </div>
        )}
        {(langs.length > 0 || goals.length > 0) && (
          <div className="flex items-start gap-2 text-muted">
            <dt>
              <Languages aria-hidden="true" className="mt-0.5 size-4" />
              <span className="sr-only">{t("langsGoals")}</span>
            </dt>
            <dd>{[...langs, ...goals].join(" · ")}</dd>
          </div>
        )}
        {p.voice && (
          <div className="flex items-center gap-2 text-muted">
            <dt>
              <Mic aria-hidden="true" className="size-4" />
              <span className="sr-only">{t("voice")}</span>
            </dt>
            <dd>{opt("voice", p.voice)}</dd>
          </div>
        )}
      </dl>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Clock3 aria-hidden="true" className="size-3.5" />
          {t("updated", { when: ago(p.updated_at, locale, t("today")) })}
        </span>
        {profileHref !== null && (
          <Link href={profileHref ?? `/jugador/${p.user_id}`} className="btn-ghost" aria-label={t("viewLabel", { name })}>
            {t("view")}
          </Link>
        )}
      </div>
    </li>
  );
}
