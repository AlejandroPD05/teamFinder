import { z } from "zod";
import { GOALS, keys, LANGUAGES } from "@/lib/profile/options";
import { RESTRICTED_MESSAGE } from "@/lib/restrictions";

const optionalUuid = z.preprocess((v) => (v === "" || v == null ? null : v), z.uuid().nullable());
const optionalEnum = <T extends Record<string, string>>(o: T) =>
  z.preprocess((v) => (v === "" || v == null ? null : v), z.enum(keys(o)).nullable());

/** Convierte "YYYY-MM-DDTHH:mm" (hora local del navegador) + desfase en minutos a Date. */
export function parseLocalDateTime(value: string, tzOffsetMinutes: number): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const utc = Date.UTC(y, mo - 1, d, h, mi) + tzOffsetMinutes * 60_000;
  return Number.isFinite(utc) ? new Date(utc) : null;
}

export const createLobbySchema = z
  .object({
    mode: z.string().regex(/^[a-z0-9-]{1,32}$/, "Elige un modo."),
    note: z.string().trim().max(140, "Máximo 140 caracteres.").regex(/^[^<>]*$/, "Sin < ni >."),
    rank_min: optionalUuid,
    rank_max: optionalUuid,
    region: optionalUuid,
    language: optionalEnum(LANGUAGES),
    goal: optionalEnum(GOALS),
    when: z.enum(["now", "later"]),
    starts_at: z.string().optional(),
    tz: z.coerce.number().int().min(-840).max(840).default(0),
    roles: z.array(z.uuid()).max(4).refine((a) => new Set(a).size === a.length),
  })
  .transform((v, ctx) => {
    let startsAt: Date | null = null;
    if (v.when === "later") {
      startsAt = v.starts_at ? parseLocalDateTime(v.starts_at, v.tz) : null;
      if (!startsAt) {
        ctx.addIssue({ code: "custom", path: ["starts_at"], message: "Indica fecha y hora." });
        return z.NEVER;
      }
      const diff = startsAt.getTime() - Date.now();
      if (diff < -3_600_000 || diff > 14 * 86_400_000) {
        ctx.addIssue({ code: "custom", path: ["starts_at"], message: "Entre ahora y 14 días." });
        return z.NEVER;
      }
    }
    return { ...v, startsAt };
  });

export function createLobbyFromForm(fd: FormData) {
  return {
    mode: fd.get("mode") ?? "",
    note: fd.get("note") ?? "",
    rank_min: fd.get("rank_min") ?? "",
    rank_max: fd.get("rank_max") ?? "",
    region: fd.get("region") ?? "",
    language: fd.get("language") ?? "",
    goal: fd.get("goal") ?? "",
    when: fd.get("when") ?? "now",
    starts_at: fd.get("starts_at")?.toString() ?? "",
    tz: fd.get("tz") ?? "0",
    roles: fd.getAll("roles"),
  };
}

export const requestMessageSchema = z.string().trim().max(200, "Máximo 200 caracteres.").regex(/^[^<>]*$/, "Sin < ni >.");

/** Mensajes para los códigos (hint) que devuelven las funciones de la base de datos. */
export const LOBBY_ERRORS: Record<string, string> = {
  limit_lobbies: "Ya tienes 3 grupos abiertos. Cierra alguno para crear otro.",
  rate_limited: "Demasiadas acciones seguidas. Espera un poco.",
  not_open: "Este grupo ya no admite solicitudes (completo o cerrado).",
  already_member: "Ya estás en este grupo.",
  duplicate: "Ya tienes una solicitud en este grupo.",
  full: "No quedan plazas libres.",
  not_pending: "Esa solicitud ya estaba respondida.",
  owner: "Como creador, cierra el grupo en lugar de abandonarlo.",
  restricted: RESTRICTED_MESSAGE,
};

export const lobbyError = (hint?: string | null) =>
  (hint && LOBBY_ERRORS[hint]) || "No se pudo completar la acción. Inténtalo de nuevo.";
