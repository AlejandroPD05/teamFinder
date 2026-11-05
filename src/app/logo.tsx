import { APP_NAME } from "@/lib/config";

/** Marca provisional: dos chevrones encajados (un stack de jugadores). Geométrica y propia, sin parecerse a ningún juego. */
export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg aria-hidden="true" viewBox="0 0 32 32" className="size-7 shrink-0">
        <path d="M4 6 L16 14 L28 6 L28 12 L16 20 L4 12 Z" className="fill-accent" />
        <path d="M4 16 L16 24 L28 16 L28 22 L16 30 L4 22 Z" className="fill-muted" />
      </svg>
      <span className="font-display text-lg font-semibold tracking-wide">{APP_NAME}</span>
    </span>
  );
}
