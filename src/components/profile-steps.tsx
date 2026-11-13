import { Check } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";

type Step = { label: string; keys: string[]; href: string };

/**
 * Guía de bienvenida: el perfil en pocos pasos (no una lista de campos). Cada paso enlaza a su bloque del formulario;
 * la línea se rellena hasta el paso actual con una animación corta.
 */
export function ProfileSteps({ missing, characterLabel }: { missing: string[]; characterLabel: string | null }) {
  const t = useTranslations("profileSteps");
  const steps: Step[] = [
    { label: t("about"), keys: ["Idiomas", "Horarios", "Objetivos", "Comunicación"], href: "/perfil/editar#grupo-sobre-ti" },
    { label: t("rank"), keys: ["Rango", "Servidor"], href: "/perfil/editar#grupo-juego" },
    { label: t("roles"), keys: ["Roles"], href: "/perfil/editar#grupo-juego" },
    ...(characterLabel ? [{ label: characterLabel, keys: [characterLabel], href: "/perfil/editar#grupo-juego" }] : []),
  ];
  const done = steps.map((s) => !s.keys.some((k) => missing.includes(k)));
  const current = done.indexOf(false);
  const filled = current === -1 ? 1 : current / (steps.length - 1);

  return (
    <ol
      aria-label={t("label")}
      className="relative mt-4 grid gap-2"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` } as CSSProperties}
    >
      {/* Línea de progreso detrás de los círculos. */}
      <span aria-hidden="true" className="absolute left-[calc(100%/var(--n)/2)] right-[calc(100%/var(--n)/2)] top-4 h-0.5 bg-line" style={{ "--n": steps.length } as CSSProperties}>
        <span className="steps-fill block h-full bg-accent" style={{ "--fill": filled } as CSSProperties} />
      </span>
      {steps.map((s, i) => {
        const state = done[i] ? "done" : i === current ? "current" : "todo";
        return (
          <li key={s.label} className="relative flex flex-col items-center text-center">
            <Link
              href={s.href}
              aria-current={state === "current" ? "step" : undefined}
              className="group flex min-h-11 flex-col items-center gap-1.5 rounded-md px-1 text-xs"
            >
              <span
                className={`flex size-8 items-center justify-center rounded-full border-2 font-display text-sm font-semibold transition-transform duration-200 ease-out group-hover:scale-110 ${
                  state === "done"
                    ? "border-accent bg-accent text-bg"
                    : state === "current"
                      ? "step-current border-accent bg-panel text-text"
                      : "border-line bg-panel text-muted"
                }`}
              >
                {state === "done" ? <Check aria-hidden="true" className="size-4" /> : i + 1}
              </span>
              <span className={state === "todo" ? "text-muted" : "text-text"}>{s.label}</span>
              <span className="sr-only">{state === "done" ? t("done") : state === "current" ? t("current") : t("todo")}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
