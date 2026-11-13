import { getTranslations } from "next-intl/server";
import { titled } from "@/lib/i18n/metadata";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { loadNames } from "@/lib/lobbies/queries";
import { activeRestriction } from "@/lib/restrictions";
import { createClient } from "@/lib/supabase/server";
import { DirectChat } from "./direct-chat";

export const generateMetadata = titled("conversation", { robots: { index: false } });

export default async function ConversationPage({ params }: PageProps<"/mensajes/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const me = claims?.claims?.sub;
  if (!me) redirect(`/entrar?next=/mensajes/${id}`);

  // La RLS solo devuelve la conversación a sus dos participantes.
  const { data: conv } = await supabase.from("direct_conversations").select("id, user_a, user_b").eq("id", id).maybeSingle();
  if (!conv) notFound();
  const other = conv.user_a === me ? conv.user_b : conv.user_a;

  const [{ data: msgs }, names, { data: profile }, { data: blockedByMe }, restriction] = await Promise.all([
    supabase
      .from("direct_messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", id)
      .order("id", { ascending: false })
      .limit(100),
    loadNames(supabase, [other]),
    supabase.from("profile_cards").select("dm_policy").eq("id", other).maybeSingle(),
    supabase.from("user_blocks").select("blocked_id").eq("blocked_id", other).maybeSingle(),
    activeRestriction(supabase, me),
  ]);
  const messages = (msgs ?? []).toReversed();
  const [t, te] = await Promise.all([getTranslations("messages"), getTranslations("errors.dm")]);
  const otherName = names.get(other)?.name ?? t("player");
  // Si te ha bloqueado no se te dice: el envío falla con «no disponible», como en el resto de la web.
  const unavailable = !profile || Boolean(blockedByMe);
  const closed = profile?.dm_policy === "none" && !messages.some((m) => m.sender_id === other);
  const closedReason = unavailable
    ? t("gone")
    : restriction
      ? te("restricted")
      : te("closed");

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/mensajes" className="inline-flex min-h-11 items-center text-sm text-muted hover:text-text">
            ← {t("title")}
          </Link>
          <h1 className="font-display text-3xl font-semibold">{otherName}</h1>
        </div>
        {!unavailable && (
          <Link href={`/jugador/${other}`} className="btn-ghost">
            {t("profile")}
          </Link>
        )}
      </div>
      <DirectChat
        conversationId={id}
        me={me}
        otherName={otherName}
        initial={messages}
        canWrite={!unavailable && !closed && !restriction}
        closedReason={closedReason}
      />
    </section>
  );
}
