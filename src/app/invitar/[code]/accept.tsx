"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { acceptInviteAction, type InviteState } from "./actions";

export function AcceptInvite({ code }: { code: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(acceptInviteAction, null);
  const t = useTranslations("invite");
  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="code" value={code} />
      <button type="submit" disabled={pending} className="btn-primary">
        {t("accept")}
      </button>
      {state && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
