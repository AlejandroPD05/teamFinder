import type { Instrumentation } from "next";
import {
  alertKey,
  alertsEnabled,
  buildWebhookBody,
  createRateLimiter,
  describeError,
  type ErrorAlert,
} from "@/lib/error-alerts";

// Avisos de errores del servidor a un canal privado de Discord (ERROR_WEBHOOK_URL).
// Solo en producción y solo si la variable es un webhook de Discord válido; si no, no hace nada.
// No se usa `request.headers` ni `request.path` (llevan cookies y query strings): solo el
// método y la ruta del fichero de la página.

// Un aviso por mensaje distinto cada 10 minutos y como mucho 10 por ventana en cada instancia.
const allow = createRateLimiter({ windowMs: 10 * 60 * 1000, maxPerWindow: 10 });

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  try {
    if (!alertsEnabled(process.env)) return;

    const { message, digest } = describeError(error);
    const alert: ErrorAlert = {
      routePath: context.routePath,
      method: request.method,
      routeType: context.routeType,
      renderSource: context.renderSource,
      message,
      digest,
    };
    if (!allow(alertKey(alert))) return;

    await fetch(process.env.ERROR_WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: buildWebhookBody(alert),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Un aviso que falla nunca debe romper la respuesta ni generar más errores.
  }
};
