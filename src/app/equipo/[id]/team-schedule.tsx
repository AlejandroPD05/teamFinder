import { getTranslations } from "next-intl/server";
import { SCHEDULE_DAYS, SCHEDULE_PARTS, teamSchedule } from "@/lib/teams";

/** Rejilla de cuándo puede jugar el equipo (a partir de la disponibilidad que cada miembro deja ver). */
export async function TeamSchedule({ availabilities }: { availabilities: (string[] | null)[] }) {
  const [t, to] = await Promise.all([getTranslations("teamSchedule"), getTranslations("options")]);
  const s = teamSchedule(availabilities);
  const total = availabilities.length;
  return (
    <section aria-labelledby="horario" className="surface flex flex-col gap-3 p-5">
      <h2 id="horario" className="font-semibold">
        {t("title")}
      </h2>
      {s.shared === 0 ? (
        <p className="text-sm text-muted">{t("empty")}</p>
      ) : (
        <>
          <p className="text-sm">
            {s.best.length > 0
              ? t("best", { slots: s.best.map((x) => to(`availability.${x}` as never)).join(", "), count: s.max, total })
              : t("noOverlap")}
          </p>
          <table className="w-full table-fixed text-center text-sm">
            <caption className="sr-only">{t("caption")}</caption>
            <thead>
              <tr>
                <td />
                {SCHEDULE_PARTS.map((p) => (
                  <th key={p} scope="col" className="pb-1 font-normal text-muted">
                    {t(`part.${p}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCHEDULE_DAYS.map((d) => (
                <tr key={d}>
                  <th scope="row" className="pr-2 text-left font-normal text-muted">
                    {t(`day.${d}`)}
                  </th>
                  {SCHEDULE_PARTS.map((p) => {
                    const n = s.counts.get(`${d}_${p}`) ?? 0;
                    const best = s.best.includes(`${d}_${p}`);
                    return (
                      <td key={p} className="p-0.5">
                        <span
                          className={`flex min-h-11 items-center justify-center rounded-md border ${best ? "border-accent bg-accent/20 font-semibold" : n > 0 ? "border-line bg-panel-hover" : "border-line text-muted"}`}
                        >
                          {n}
                          <span className="sr-only"> {t("of", { total })}</span>
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {s.hidden > 0 && <p className="text-xs text-muted">{t("hidden", { count: s.hidden })}</p>}
        </>
      )}
    </section>
  );
}
