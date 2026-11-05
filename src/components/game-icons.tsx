"use client";

import { Crosshair, Radar, Shield, Wind, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

// Iconos de juego. Los de agentes y rangos son recursos de Riot Games (política «Legal Jibber Jabber»),
// servidos desde valorant-api.com a través del optimizador de Next. Si fallan, se muestra un sustituto con iniciales.

const ROLE_ICONS: Record<string, LucideIcon> = {
  duelist: Crosshair,
  initiator: Radar,
  controller: Wind,
  sentinel: Shield,
};

export function RoleIcon({ slug, className = "size-4" }: { slug?: string | null; className?: string }) {
  const Icon = (slug && ROLE_ICONS[slug]) || Crosshair;
  return <Icon aria-hidden="true" className={className} />;
}

function Fallback({ label, size }: { label: string; size: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-md bg-panel-hover text-xs font-semibold text-muted"
    >
      {label.slice(0, 2).toUpperCase()}
    </span>
  );
}

/** Retrato de agente. `decorative` cuando el nombre ya está escrito al lado. */
export function CharacterIcon({
  name,
  src,
  size = 32,
  decorative = true,
  ring,
}: {
  name: string;
  src?: string | null;
  size?: number;
  decorative?: boolean;
  ring?: "main" | "comfort" | null;
}) {
  const [failed, setFailed] = useState(false);
  const ringClass =
    ring === "main" ? "ring-2 ring-accent" : ring === "comfort" ? "ring-2 ring-info/70" : "ring-1 ring-line";
  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-md bg-bg-raised ${ringClass}`}
      style={{ width: size, height: size }}
      title={decorative ? undefined : name}
    >
      {src && !failed ? (
        <Image
          src={src}
          alt={decorative ? "" : name}
          width={size}
          height={size}
          sizes={`${size}px`}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Fallback label={name} size={size} />
      )}
    </span>
  );
}

/** Rango con su emblema y su nombre. Siempre indica que lo introduce el jugador. */
export function RankBadge({
  name,
  src,
  color,
  manual = true,
  size = 24,
}: {
  name: string;
  src?: string | null;
  color?: string | null;
  manual?: boolean;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="inline-flex items-center gap-1.5">
      {src && !failed ? (
        <Image src={src} alt="" width={size} height={size} sizes={`${size}px`} onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true" className="inline-block size-2.5 rounded-full" style={{ background: color ?? "#9ca0b4" }} />
      )}
      <span className="font-medium">{name}</span>
      {manual && <span className="text-xs text-muted">· manual</span>}
    </span>
  );
}
