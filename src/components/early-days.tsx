import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { discordInvite } from "@/lib/config";

/**
 * Pantalla vacía de los primeros días: dice la verdad (aún somos pocos) y propone lo que sí sirve ahora mismo para
 * que la próxima persona que entre te encuentre: marcarte disponible, invitar a alguien o pasar por el Discord.
 */
export async function EarlyDays({ heading, text }: { heading: string; text: string }) {
  const t = await getTranslations("earlyDays");
  const discord = discordInvite();
  return (
    <div className="rounded-lg border border-dashed border-line p-6 text-center">
      <h2 className="font-semibold">{heading}</h2>
      <p className="mt-1 text-sm text-muted">{text}</p>
      <p className="mx-auto mt-3 max-w-xl text-sm">{t("lead")}</p>
      <ul className="mt-3 flex flex-wrap justify-center gap-2">
        <li>
          <Link href="/inicio#ahora" className="btn-ghost">
            {t("available")}
          </Link>
        </li>
        <li>
          <Link href="/grupos/nuevo" className="btn-ghost">
            {t("createLobby")}
          </Link>
        </li>
        <li>
          <Link href="/amigos" className="btn-ghost">
            {t("invite")}
          </Link>
        </li>
        {discord && (
          <li>
            <a href={discord} target="_blank" rel="noopener noreferrer" className="btn-ghost">
              {t("discord")}
              <ExternalLink aria-hidden="true" className="size-3.5" />
              <span className="sr-only"> {t("newTab")}</span>
            </a>
          </li>
        )}
      </ul>
    </div>
  );
}
