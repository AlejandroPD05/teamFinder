import { LOGO_BOTTOM, LOGO_TOP } from "@/lib/brand";
import { APP_NAME } from "@/lib/config";

/** Marca provisional: dos chevrones encajados (un stack de jugadores). Geométrica y propia, sin parecerse a ningún juego. */
export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg aria-hidden="true" viewBox="0 0 32 32" className="size-7 shrink-0">
        <path d={LOGO_TOP} className="fill-accent" />
        <path d={LOGO_BOTTOM} className="fill-muted" />
      </svg>
      <span className="font-display text-lg font-semibold tracking-wide">{APP_NAME}</span>
    </span>
  );
}
