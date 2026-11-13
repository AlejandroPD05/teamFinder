import { Lock } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { isFanartUrl } from "@/lib/fanart";
import type { Card, Rarity } from "@/lib/missions/queries";

// Color de cada rareza; el nombre está en messages/*.json (options.rarity).
export const RARITY: Record<Rarity, { color: string }> = {
  common: { color: "#9ca0b4" },
  rare: { color: "#60a5fa" },
  epic: { color: "#b794f6" },
  legendary: { color: "#f5c451" },
};

/** Carta coleccionable: arte oficial, marco del color de su rareza. Bloqueada, solo muestra nombre y rareza. */
export function CollectibleCard({
  card,
  locked = false,
  className = "",
  priority = false,
}: {
  card: Pick<Card, "name" | "image_url" | "rarity">;
  locked?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const r = RARITY[card.rarity];
  const t = useTranslations("options.rarity");
  return (
    <figure
      className={`relative aspect-[3/4] overflow-hidden rounded-xl border-2 ${className}`}
      style={{ "--rarity": r.color, borderColor: locked ? "var(--color-line)" : r.color, background: `color-mix(in srgb, ${r.color} 12%, var(--color-panel))` } as CSSProperties}
    >
      {locked ? (
        <div aria-hidden="true" className="flex h-full items-center justify-center bg-bg-raised">
          <Lock className="size-8 text-muted" />
        </div>
      ) : (
        <Image
          src={card.image_url}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 45vw"
          // El arte propio (SVG de /cards) se sirve tal cual (el optimizador de Next no convierte SVG). El fanart ya viene
          // limitado a 2 MB desde el almacenamiento de Supabase y tampoco pasa por el optimizador.
          unoptimized={card.image_url.endsWith(".svg") || isFanartUrl(card.image_url)}
          className="object-cover object-top"
        />
      )}
      <figcaption className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-bg/90 px-3 py-2">
        <span className="font-display truncate font-semibold">{card.name}</span>
        <span className="text-xs font-medium" style={{ color: locked ? "var(--color-muted)" : r.color }}>
          {t(card.rarity)}
          {locked && ` · ${t("locked")}`}
        </span>
      </figcaption>
    </figure>
  );
}
