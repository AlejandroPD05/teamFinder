"use client";

import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { startConversationAction, type DmState } from "./actions";

export function StartConversationButton({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<DmState, FormData>(startConversationAction, null);
  const t = useTranslations("messages");
  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <input type="hidden" name="user_id" value={userId} />
      <button type="submit" disabled={pending} className="btn-primary">
        <MessageSquare aria-hidden="true" className="size-4" />
        {t("send")}
      </button>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
