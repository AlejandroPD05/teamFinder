import { APP_NAME } from "@/lib/config";

/** Marca provisional: dos chevrones encajados (un stack de jugadores). Geométrica y propia, sin parecerse a ningún juego. */
export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg aria-hidden="true" viewBox="0 0 32 32" className="size-7 shrink-0">
        <defs>
          <linearGradient id="tf-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: "var(--color-accent-soft)" }} />
            <stop offset="1" style={{ stopColor: "var(--color-info)" }} />
          </linearGradient>
        </defs>
        <path d="M4 6 L16 14 L28 6 L28 12 L16 20 L4 12 Z" fill="url(#tf-g)" />
        <path d="M4 16 L16 24 L28 16 L28 22 L16 30 L4 22 Z" fill="url(#tf-g)" opacity="0.55" />
      </svg>
      <span className="font-display text-lg font-semibold tracking-wide">{APP_NAME}</span>
    </span>
  );
}
