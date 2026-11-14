import { getTranslations } from "next-intl/server";
import { reliabilityFacts, shortDuration, type Reliability } from "@/lib/reliability";

/** Fiabilidad en el perfil: hechos de los últimos 90 días, sin nota ni sanción. */
export async function ReliabilitySection({ data, signedIn }: { data: Reliability | null; signedIn: boolean }) {
  const t = await getTranslations("reliability");
  const facts = reliabilityFacts(data);
  return (
    <section aria-labelledby="fiabilidad" className="surface p-5">
      <h2 id="fiabilidad" className="font-semibold">
        {t("title")}
      </h2>
      {!signedIn ? (
        <p className="mt-2 text-sm text-muted">{t("signIn")}</p>
      ) : facts.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{t("notEnough")}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {facts.map((f) => (
            <li key={f.key}>
              {f.key === "completion"
                ? t("completion", { pct: f.pct, finished: f.finished, total: f.total })
                : f.key === "response"
                  ? t("response", { pct: f.pct })
                  : t(`responseTime.${shortDuration(f.minutes).unit}`, { value: shortDuration(f.minutes).value })}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted">{t("note")}</p>
    </section>
  );
}
