import { z } from "zod";
import { parseClipUrl } from "./links";
import { RESTRICTED_MESSAGE } from "@/lib/restrictions";

export const postClipSchema = z.object({
  url: z
    .string()
    .trim()
    .max(300, "Enlace demasiado largo.")
    .transform((u, ctx) => {
      const ref = parseClipUrl(u);
      if (!ref) {
        ctx.addIssue({ code: "custom", message: "Pega un enlace de YouTube, de un clip de Twitch o de Streamable." });
        return z.NEVER;
      }
      return ref;
    }),
  title: z
    .string()
    .trim()
    .min(3, "El título necesita al menos 3 caracteres.")
    .max(80, "El título no puede pasar de 80 caracteres.")
    .regex(/^[^<>]+$/, "El título no puede contener < ni >."),
  emblem: z.uuid("Elige una categoría."),
});

export const commentSchema = z
  .string()
  .trim()
  .min(1, "Escribe algo.")
  .max(300, "Como mucho 300 caracteres.");

/** Mensajes para los errores de las funciones de la base de datos (pista `hint`). */
export function clipError(hint: string | undefined): string {
  switch (hint) {
    case "rate_limited":
      return "Has llegado al límite por ahora. Prueba más tarde.";
    case "duplicate":
      return "Ese clip ya está publicado.";
    case "own":
      return "No puedes dar emblemas a tus propios clips.";
    case "not_found":
    case "invalid":
      return "Ese clip ya no está disponible.";
    case "self":
      return "No puedes denunciarte.";
    case "restricted":
      return RESTRICTED_MESSAGE;
    default:
      return "No se pudo completar. Inténtalo de nuevo.";
  }
}
