import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { GONE_STATUS, pushRequestSchema, secretMatches, vapidConfig } from "@/lib/push";
import { supabaseEnv } from "@/lib/supabase/env";

export const runtime = "nodejs";

/**
 * Envío de notificaciones push. Solo lo llama la base de datos (private.push_notify) con el secreto compartido
 * PUSH_WEBHOOK_SECRET; trae el texto, la ruta y las suscripciones del destinatario. Las suscripciones caducadas
 * se devuelven a la base de datos para borrarlas.
 */
export async function POST(req: Request) {
  const config = vapidConfig();
  if (!config) return Response.json({ error: "push no configurado" }, { status: 503 });
  if (!secretMatches(req.headers.get("x-push-secret"), config.secret)) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }
  const parsed = pushRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "petición no válida" }, { status: 400 });
  const { title, body, url, subscriptions } = parsed.data;

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  const payload = JSON.stringify({ title, body, url });
  const gone: string[] = [];
  let sent = 0;
  await Promise.all(
    subscriptions.map(async (s) => {
      try {
        await webpush.sendNotification(s, payload, { TTL: 60 * 60, urgency: "normal" });
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status && GONE_STATUS.has(status)) gone.push(s.endpoint);
      }
    }),
  );

  if (gone.length) {
    const { url: supabaseUrl, key } = supabaseEnv();
    await createClient(supabaseUrl, key, { auth: { persistSession: false } }).rpc("prune_push_subscriptions", {
      p_secret: config.secret,
      p_endpoints: gone,
    });
  }
  return Response.json({ sent, gone: gone.length });
}
