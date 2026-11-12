import { z } from "zod";
import { RESTRICTED_MESSAGE } from "./restrictions";

/** Versión del texto de permiso que acepta el artista (se guarda con cada envío). Si cambia el texto, cambia la versión. */
export const FANART_LICENSE_VERSION = "fanart-v1-2026-11-13";

export const FANART_LICENSE =
  "Declaro que soy el autor o la autora de esta obra y que no copia obras de otras personas. Doy permiso, gratis, no " +
  "exclusivo y revocable, para mostrarla en esta web como carta coleccionable con mi crédito. Las cartas no se venden " +
  "ni se intercambian. Puedo retirar el permiso cuando quiera desde esta página y la carta dejará de mostrarse.";

export const FANART_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as const;
export const FANART_MAX_BYTES = 2 * 1024 * 1024;

const text = (min: number, max: number, what: string) =>
  z
    .string()
    .trim()
    .min(min, `${what}: al menos ${min} caracteres.`)
    .max(max, `${what}: como mucho ${max} caracteres.`)
    .regex(/^[^<>]*$/, `${what}: sin < ni >.`);

export const fanartSchema = z.object({
  game: z.string().regex(/^[a-z0-9-]{2,32}$/),
  title: text(2, 60, "Título"),
  artist: text(2, 60, "Nombre artístico"),
  portfolio: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v) || null,
    z
      .string()
      .regex(/^https:\/\/[^\s<>"]{4,200}$/, "El enlace a tu portfolio debe empezar por https://")
      .nullable(),
  ),
  path: z.string().regex(/^[0-9a-f-]{36}\/[A-Za-z0-9_-]{1,80}\.(png|jpg|jpeg|webp)$/, "Sube una imagen."),
  license: z.literal("on", { message: "Tienes que aceptar el permiso para enviarla." }),
});

export function fanartError(hint?: string | null): string {
  switch (hint) {
    case "rate_limited":
      return "Has enviado 5 obras esta semana. Prueba más adelante.";
    case "invalid":
      return "La imagen no se ha subido bien. Vuelve a intentarlo.";
    case "not_pending":
      return "Ese envío ya estaba revisado.";
    case "restricted":
      return RESTRICTED_MESSAGE;
    default:
      return "No se pudo completar. Inténtalo de nuevo.";
  }
}

export const FANART_STATUS = {
  pending: "Pendiente de revisión",
  approved: "Aprobada: ya es una carta",
  rejected: "No aprobada",
  withdrawn: "Retirada",
} as const;

/** URL pública de una imagen del bucket de fanart (las cartas aprobadas la usan tal cual). */
export function isFanartUrl(url: string) {
  return url.includes("/storage/v1/object/public/fanart/");
}
