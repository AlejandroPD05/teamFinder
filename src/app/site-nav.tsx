"use client";

import { Clapperboard, MessagesSquare, Search, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { NumberRoll } from "@/components/number-roll";

const LINKS = [
  { href: "/buscar", label: "search", Icon: Search, match: "/buscar" },
  { href: "/grupos", label: "lobbies", Icon: UsersRound, match: "/grupos" },
  { href: "/clips", label: "clips", Icon: Clapperboard, match: "/clips" },
  { href: "/mensajes", label: "inbox", Icon: MessagesSquare, match: "/mensajes" },
  { href: "/perfil", label: "profile", Icon: UserRound, match: "/perfil" },
] as const;

/** Navegación principal con estado activo. En móvil ocupa una segunda fila a lo ancho. */
export function SiteNav({ unread }: { unread: number }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  return (
    <div className="order-last -mx-4 flex w-[calc(100%+2rem)] border-t border-line lg:order-none lg:mx-0 lg:ml-auto lg:w-auto lg:border-0">
      {LINKS.map(({ href, label, Icon, match }) => {
        const active = pathname === match || pathname.startsWith(`${match}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative inline-flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 px-2 text-xs lg:min-h-11 lg:flex-none lg:flex-row lg:gap-2 lg:rounded-md lg:px-3 lg:text-sm ${
              active ? "text-text" : "text-muted hover:text-text lg:hover:bg-panel"
            }`}
          >
            <Icon aria-hidden="true" className={`size-5 lg:size-4 ${active ? "text-accent-soft" : ""}`} />
            <span className="whitespace-nowrap">{t(label)}</span>
            {href === "/mensajes" && unread > 0 && (
              <span className="absolute right-[calc(50%-1.75rem)] top-1 rounded-full bg-accent px-1.5 text-[0.65rem] font-semibold leading-4 text-bg lg:static lg:text-xs">
                <NumberRoll value={unread} max={99} />
                <span className="sr-only"> {t("unread")}</span>
              </span>
            )}
            {active && (
              <span
                aria-hidden="true"
                className="absolute inset-x-3 bottom-0 h-0.5 bg-accent lg:-bottom-[0.6rem]"
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
