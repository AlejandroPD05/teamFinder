import { z } from "zod";
import { GOALS, keys, LANGUAGES } from "@/lib/profile/options";
import type { AppLocale } from "@/lib/i18n/locale";
import { errorMessage, translator } from "@/lib/i18n/translator";

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

/** Esquema del formulario de grupo con los mensajes en el idioma pedido. */
export function createLobbySchemaFor(locale: AppLocale) {
  const t = translator(locale, "validation.lobby");
  return z
  .object({
    mode: z.string().regex(/^[a-z0-9-]{1,32}$/, t("mode")),
    note: z.string().trim().max(140, t("noteMax")).regex(/^[^<>]*$/, t("chars")),
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
        ctx.addIssue({ code: "custom", path: ["starts_at"], message: t("startsAt") });
        return z.NEVER;
      }
      const diff = startsAt.getTime() - Date.now();
      if (diff < -3_600_000 || diff > 14 * 86_400_000) {
        ctx.addIssue({ code: "custom", path: ["starts_at"], message: t("startsRange") });
        return z.NEVER;
      }
    }
    return { ...v, startsAt };
  });
}

export const createLobbySchema = createLobbySchemaFor("es");

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

export function requestMessageSchemaFor(locale: AppLocale) {
  const t = translator(locale, "validation.lobby");
  return z.string().trim().max(200, t("requestMax")).regex(/^[^<>]*$/, t("chars"));
}

export const requestMessageSchema = requestMessageSchemaFor("es");

/** Mensajes para los códigos (hint) que devuelven las funciones de la base de datos (errors.lobby). */
export const lobbyError = (hint?: string | null, locale: AppLocale = "es") => errorMessage("lobby", hint, locale);
