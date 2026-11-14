"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useRef, useState, useTransition } from "react";
import { FANART_MAX_BYTES, FANART_TYPES } from "@/lib/limits";
import { browserClient } from "@/lib/supabase/client";
import { reviewFanartAction, submitFanartAction, withdrawFanartAction, type FanartState } from "./actions";
import { outcomeOf, useStickyForm } from "@/lib/use-sticky-form";

const control = "min-h-11 w-full rounded-md border border-line bg-bg px-3 text-text focus:border-accent";
const btn = "min-h-11 rounded-md px-4 text-sm disabled:opacity-60";

function Status({ state }: { state: FanartState }) {
  return (
    <p role="status" aria-live="polite" className={`text-sm ${state?.ok ? "text-success" : "text-danger"}`}>
      {state?.message}
    </p>
  );
}

/** Envío de fanart: la imagen se sube desde el navegador a la carpeta de la persona y después se registra el envío. */
export function FanartForm({ userId, games, current }: { userId: string; games: { id: string; name: string }[]; current: string }) {
  const [state, setState] = useState<FanartState>(null);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const t = useTranslations("fanart");
  const locale = useLocale();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("image");
    start(async () => {
      if (!(file instanceof File) || file.size === 0) return setState({ ok: false, message: t("chooseImage") });
      const ext = FANART_TYPES[file.type as keyof typeof FANART_TYPES];
      if (!ext) return setState({ ok: false, message: t("imageType") });
      if (file.size > FANART_MAX_BYTES) return setState({ ok: false, message: t("imageSize") });
      if (fd.get("license") !== "on") return setState({ ok: false, message: t("acceptLicense") });
      const path = `${userId}/${crypto.randomUUID().replaceAll("-", "")}.${ext}`;
      const { error } = await browserClient().storage.from("fanart").upload(path, file, { contentType: file.type, upsert: false });
      if (error) return setState({ ok: false, message: t("uploadError") });
      fd.delete("image");
      fd.set("path", path);
      const result = await submitFanartAction(null, fd);
      setState(result);
      if (result?.ok) formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} className="flex flex-col gap-4 surface p-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="fa-title" className="text-sm font-medium">
            {t("titleLabel")}
          </label>
          <input id="fa-title" name="title" required minLength={2} maxLength={60} className={`${control} mt-2`} />
        </div>
        <div>
          <label htmlFor="fa-artist" className="text-sm font-medium">
            {t("artist")}
          </label>
          <input id="fa-artist" name="artist" required minLength={2} maxLength={60} className={`${control} mt-2`} />
        </div>
        <div>
          <label htmlFor="fa-game" className="text-sm font-medium">
            {t("game")}
          </label>
          <select id="fa-game" name="game" defaultValue={current} className={`${control} mt-2`}>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="fa-portfolio" className="text-sm font-medium">
            {t("portfolio")}
          </label>
          <input id="fa-portfolio" name="portfolio" type="url" inputMode="url" placeholder="https://" maxLength={200} className={`${control} mt-2`} />
        </div>
      </div>
      <div>
        <label htmlFor="fa-image" className="text-sm font-medium">
          {t("image")}
        </label>
        <input
          id="fa-image"
          name="image"
          type="file"
          required
          accept="image/png,image/jpeg,image/webp"
          className="mt-2 block w-full text-sm text-muted file:mr-3 file:min-h-11 file:rounded-md file:border file:border-line file:bg-panel file:px-4 file:text-text"
        />
      </div>
      <label className="flex items-start gap-3 rounded-md border border-line p-3 text-sm has-[:checked]:border-accent">
        <input type="checkbox" name="license" required className="mt-1 size-4 shrink-0 accent-accent" />
        <span>
          {t("license")}
          {locale !== "es" && <span className="mt-1 block text-xs text-muted">{t("licenseNote")}</span>}
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? t("sending") : t("send")}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function WithdrawFanart({ id }: { id: string }) {
  const [state, action, pending] = useActionState<FanartState, FormData>(withdrawFanartAction, null);
  const t = useTranslations("fanart");
  if (state?.ok) return <Status state={state} />;
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(t("withdrawConfirm"))) e.preventDefault();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className={`${btn} border border-line hover:bg-panel-hover`}>
        {t("withdraw")}
      </button>
      <Status state={state} />
    </form>
  );
}

export function ReviewFanart({ id, title }: { id: string; title: string }) {
  const [state, action, pending] = useActionState<FanartState, FormData>(reviewFanartAction, null);
  const form = useStickyForm(action, state, outcomeOf(state));
  const t = useTranslations("fanart");
  const tr = useTranslations("options.rarity");
  if (state?.ok) return <Status state={state} />;
  return (
    <form {...form} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("rarity")}</span>
          <select name="rarity" defaultValue="rare" className={control}>
            {(["common", "rare", "epic", "legendary"] as const).map((r) => (
              <option key={r} value={r}>
                {tr(r)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("reviewNote")}</span>
          <input name="note" maxLength={300} className={control} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" name="decision" value="approve" disabled={pending} aria-label={t("approveLabel", { title })} className={`${btn} bg-accent font-semibold text-bg`}>
          {t("approve")}
        </button>
        <button type="submit" name="decision" value="reject" disabled={pending} aria-label={t("rejectLabel", { title })} className={`${btn} border border-line hover:bg-panel-hover`}>
          {t("reject")}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}
