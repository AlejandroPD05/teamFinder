"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function CopyInviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("invite");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="invite-url" className="sr-only">
        {t("linkLabel")}
      </label>
      <input id="invite-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-bg px-3 text-sm" />
      <button type="button" onClick={() => void navigator.clipboard?.writeText(url).then(() => setCopied(true), () => {})} className="btn-primary">
        {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}
