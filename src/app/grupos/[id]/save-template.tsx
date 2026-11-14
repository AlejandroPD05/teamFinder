"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { saveTemplateAction, type TemplateState } from "../template-actions";
import { outcomeOf, useStickyForm } from "@/lib/use-sticky-form";

/** El creador guarda su grupo como plantilla para repetirlo en un clic. */
export function SaveTemplate({ lobbyId, defaultName }: { lobbyId: string; defaultName: string }) {
  const [state, action, pending] = useActionState<TemplateState, FormData>(saveTemplateAction, null);
  const form = useStickyForm(action, state, outcomeOf(state));
  const t = useTranslations("templates");
  return (
    <details className="surface p-5 [&[open]>summary]:mb-3">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">{t("saveTitle")}</summary>
      <p className="mb-3 text-sm text-muted">{t("saveLead")}</p>
      <form {...form} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="lobby_id" value={lobbyId} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="template-name" className="text-sm">
            {t("name")}
          </label>
          <input
            id="template-name"
            name="name"
            required
            minLength={2}
            maxLength={40}
            defaultValue={defaultName.slice(0, 40)}
            className="min-h-11 rounded-md border border-line bg-bg px-3 text-sm"
          />
        </div>
        <button type="submit" disabled={pending} className="btn-ghost">
          {t("save")}
        </button>
      </form>
      <p role="status" aria-live="polite" className={`text-sm ${state?.ok ? "text-success" : "text-danger"}`}>
        {state?.message}
      </p>
    </details>
  );
}
