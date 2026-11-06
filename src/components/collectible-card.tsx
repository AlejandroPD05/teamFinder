import { Lock } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import type { Card, Rarity } from "@/lib/missions/queries";

export const RARITY: Record<Rarity, { label: string; color: string }> = {
  common: { label: "Común", color: "#9ca0b4" },
  rare: { label: "Rara", color: "#60a5fa" },
  epic: { label: "Épica", color: "#b794f6" },
  legendary: { label: "Legendaria", color: "#f5c451" },
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
          className="object-cover object-top"
        />
      )}
      <figcaption className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-bg/90 px-3 py-2">
        <span className="font-display truncate font-semibold">{card.name}</span>
        <span className="text-xs font-medium" style={{ color: locked ? "var(--color-muted)" : r.color }}>
          {r.label}
          {locked && " · bloqueada"}
        </span>
      </figcaption>
    </figure>
  );
}
