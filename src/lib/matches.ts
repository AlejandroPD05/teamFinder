import { z } from "zod";
import type { AppLocale } from "./i18n/locale";
import { translator } from "./i18n/translator";

// Partidas introducidas a mano (prompt §4.6). Siempre se muestran como «introducido manualmente»: no son datos
// oficiales ni cuentan para el ranking semanal ni para ningún rating.

export { MATCH_RESULTS } from "./limits";

const optUuid = z.preprocess((v) => (v === "" || v == null ? null : v), z.uuid().nullable());

/** Esquema de una partida con los mensajes en el idioma pedido. */
export function matchSchemaFor(locale: AppLocale) {
  const t = translator(locale, "validation.match");
  const optInt = (max: number, field: "kills" | "deaths" | "assists") =>
    z.preprocess(
      (v) => (v === "" || v == null ? null : Number(v)),
      z
        .number({ message: t("number", { field }) })
        .int(t("integer", { field }))
        .min(0, t("negative", { field }))
        .max(max, t("max", { field, max }))
        .nullable(),
    );
  return z
  .object({
    played_on: z.iso.date({ message: t("date") }),
    mode_id: optUuid,
    map_name: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() : v) || null,
      z.string().max(40, t("mapMax")).regex(/^[^<>]*$/, t("mapChars")).nullable(),
    ),
    character_id: optUuid,
    result: z.preprocess((v) => (v === "" || v == null ? null : v), z.enum(["win", "loss", "draw"]).nullable()),
    placement: z.preprocess(
      (v) => (v === "" || v == null ? null : Number(v)),
      z.number().int().min(1, t("placement")).max(60, t("placement")).nullable(),
    ),
    kills: optInt(200, "kills"),
    deaths: optInt(200, "deaths"),
    assists: optInt(200, "assists"),
    note: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() : v) || null,
      z.string().max(200, t("noteMax")).regex(/^[^<>]*$/, t("noteChars")).nullable(),
    ),
  })
  .refine((m) => m.played_on <= todayInMadrid(), { message: t("future"), path: ["played_on"] });
}

export const matchSchema = matchSchemaFor("es");

export type MatchInput = z.infer<typeof matchSchema>;

export function matchFromForm(fd: FormData) {
  const get = (k: string) => fd.get(k) ?? "";
  return {
    played_on: get("played_on"),
    mode_id: get("mode_id"),
    map_name: get("map_name"),
    character_id: get("character_id"),
    result: get("result"),
    placement: get("placement"),
    kills: get("kills"),
    deaths: get("deaths"),
    assists: get("assists"),
    note: get("note"),
  };
}

/** Fecha de hoy en España, AAAA-MM-DD. */
export function todayInMadrid(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(now);
}

/** Resumen de las partidas apuntadas (solo para mostrar: no es una estadística oficial). */
export function matchSummary(rows: { result: string | null; kills: number | null; deaths: number | null }[]) {
  const withResult = rows.filter((r) => r.result);
  const wins = withResult.filter((r) => r.result === "win").length;
  const kd = rows.filter((r) => r.kills != null && r.deaths != null);
  const k = kd.reduce((n, r) => n + (r.kills ?? 0), 0);
  const d = kd.reduce((n, r) => n + (r.deaths ?? 0), 0);
  return {
    total: rows.length,
    winRate: withResult.length ? Math.round((wins / withResult.length) * 100) : null,
    kd: kd.length ? (d === 0 ? k : Math.round((k / d) * 100) / 100) : null,
  };
}
