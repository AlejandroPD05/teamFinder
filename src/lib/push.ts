import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

// Notificaciones push: la base de datos (private.push_notify) llama a /api/push con un secreto compartido y la web
// firma y envía con sus claves VAPID. Aquí, la parte pura (validación y comparación del secreto), con tests.

export const pushRequestSchema = z.object({
  title: z.string().min(1).max(80),
  body: z.string().max(140),
  url: z.string().regex(/^\/[A-Za-z0-9/_\-?=&.]*$/, "Ruta interna").max(200),
  subscriptions: z
    .array(
      z.object({
        endpoint: z.string().url().startsWith("https://").max(1000),
        keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
      }),
    )
    .min(1)
    .max(20),
});

export type PushRequest = z.infer<typeof pushRequestSchema>;

/** Compara el secreto recibido con el configurado sin filtrar información por el tiempo de respuesta. */
export function secretMatches(received: string | null, expected: string | undefined): boolean {
  if (!received || !expected || expected.length < 32) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Configuración VAPID completa (si falta algo, los push están desactivados). */
export function vapidConfig(env: NodeJS.ProcessEnv = process.env) {
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  const subject = env.VAPID_SUBJECT?.trim();
  const secret = env.PUSH_WEBHOOK_SECRET?.trim();
  if (!publicKey || !privateKey || !subject || !secret || !/^(mailto:|https:\/\/)/.test(subject)) return null;
  return { publicKey, privateKey, subject, secret };
}

/** Códigos con los que el servicio de push dice que la suscripción ya no existe (hay que borrarla). */
export const GONE_STATUS = new Set([404, 410]);
