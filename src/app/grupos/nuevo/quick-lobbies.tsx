"use client";

import { Repeat, Trash2, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { deleteTemplateAction, quickLobbyAction, type TemplateState } from "../template-actions";

type Template = { id: string; name: string; summary: string };

/** Crear grupo en un clic: tus plantillas y «repetir mi último grupo». */
export function QuickLobbies({ templates, last }: { templates: Template[]; last: { id: string; summary: string } | null }) {
  const [state, create, creating] = useActionState<TemplateState, FormData>(quickLobbyAction, null);
  const [delState, remove, removing] = useActionState<TemplateState, FormData>(deleteTemplateAction, null);
  const t = useTranslations("templates");
  const msg = state ?? delState;
  return (
    <section aria-labelledby="un-clic" className="surface flex flex-col gap-3 p-5">
      <h2 id="un-clic" className="font-semibold">
        {t("quickTitle")}
      </h2>
      <ul className="flex flex-col gap-2">
        {last && (
          <li className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0 text-sm">
              <span className="font-medium">{t("repeatLast")}</span>
              <span className="block text-muted">{last.summary}</span>
            </span>
            <form action={create}>
              <input type="hidden" name="lobby_id" value={last.id} />
              <button type="submit" disabled={creating} className="btn-primary">
                <Repeat aria-hidden="true" className="size-4" />
                {t("create")}
              </button>
            </form>
          </li>
        )}
        {templates.map((tpl) => (
          <li key={tpl.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
            <span className="min-w-0 text-sm">
              <span className="font-medium">{tpl.name}</span>
              <span className="block text-muted">{tpl.summary}</span>
            </span>
            <span className="flex gap-2">
              <form action={create}>
                <input type="hidden" name="template_id" value={tpl.id} />
                <button type="submit" disabled={creating} className="btn-primary" aria-label={t("createFrom", { name: tpl.name })}>
                  <Zap aria-hidden="true" className="size-4" />
                  {t("create")}
                </button>
              </form>
              <form action={remove}>
                <input type="hidden" name="template_id" value={tpl.id} />
                <button type="submit" disabled={removing} className="btn-ghost" aria-label={t("deleteNamed", { name: tpl.name })}>
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </form>
            </span>
          </li>
        ))}
      </ul>
      {templates.length === 0 && <p className="text-sm text-muted">{t("hint")}</p>}
      <p role="status" aria-live="polite" className={`text-sm ${msg?.ok ? "text-success" : "text-danger"}`}>
        {msg?.message}
      </p>
    </section>
  );
}
