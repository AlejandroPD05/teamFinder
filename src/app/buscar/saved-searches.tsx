"use client";

import { Bell, BellOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { outcomeOf, useStickyForm } from "@/lib/use-sticky-form";
import { saveSearchAction, savedSearchAction, type SavedState } from "./saved-actions";

type Saved = { id: string; name: string; query: string; alerts: boolean };

/**
 * Búsquedas guardadas: volver a abrirlas en un clic y, con la alerta activada, recibir un aviso cuando alguien que encaja
 * (rol, rango, servidor, idioma) se marca «disponible ahora». Como mucho una alerta cada 3 horas por búsqueda.
 */
export function SavedSearches({ saved, query, canSave, alertIgnores }: { saved: Saved[]; query: string; canSave: boolean; alertIgnores: boolean }) {
  const [state, save, saving] = useActionState<SavedState, FormData>(saveSearchAction, null);
  const [itemState, act, acting] = useActionState<SavedState, FormData>(savedSearchAction, null);
  const form = useStickyForm(save, state, outcomeOf(state), { resetOnSuccess: true });
  const t = useTranslations("savedSearches");
  const msg = itemState ?? state;
  if (!canSave && saved.length === 0) return null;
  return (
    <section aria-labelledby="guardadas" className="surface flex flex-col gap-3 p-4">
      <h2 id="guardadas" className="font-semibold">
        {t("title")}
      </h2>
      {saved.length > 0 && (
        <ul className="flex flex-col gap-2">
          {saved.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2">
              <Link href={`/buscar${s.query ? `?${s.query}` : ""}`} className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">
                {s.name}
              </Link>
              <span className="flex gap-2">
                <form action={act}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="intent" value={s.alerts ? "alerts_off" : "alerts_on"} />
                  <button type="submit" disabled={acting} className="btn-ghost" aria-pressed={s.alerts} aria-label={t("alertsLabel", { name: s.name })}>
                    {s.alerts ? <Bell aria-hidden="true" className="size-4" /> : <BellOff aria-hidden="true" className="size-4" />}
                    {s.alerts ? t("alertOn") : t("alertOff")}
                  </button>
                </form>
                <form action={act}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="intent" value="delete" />
                  <button type="submit" disabled={acting} className="btn-ghost" aria-label={t("deleteNamed", { name: s.name })}>
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      )}
      {canSave && (
        <form {...form} className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
          <input type="hidden" name="query" value={query} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <label htmlFor="saved-name" className="text-sm">
              {t("name")}
            </label>
            <input
              id="saved-name"
              name="name"
              required
              minLength={2}
              maxLength={40}
              placeholder={t("placeholder")}
              aria-describedby="saved-hint"
              className="min-h-11 rounded-md border border-line bg-bg px-3 text-sm"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {t("save")}
          </button>
          <p id="saved-hint" className="w-full text-xs text-muted">
            {t("hint")} {alertIgnores && t("ignores")}
          </p>
        </form>
      )}
      <p role="status" aria-live="polite" className={`text-sm ${msg?.ok ? "text-success" : "text-danger"}`}>
        {msg?.message}
      </p>
    </section>
  );
}
