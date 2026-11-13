import { z } from "zod";

// Partidas introducidas a mano (prompt §4.6). Siempre se muestran como «introducido manualmente»: no son datos
// oficiales ni cuentan para el ranking semanal ni para ningún rating.

export const MATCH_RESULTS = { win: "Victoria", loss: "Derrota", draw: "Empate" } as const;

const optInt = (max: number, what: string) =>
  z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number({ message: `${what}: un número.` }).int(`${what}: un número entero.`).min(0, `${what}: no puede ser negativo.`).max(max, `${what}: como mucho ${max}.`).nullable(),
  );
const optUuid = z.preprocess((v) => (v === "" || v == null ? null : v), z.uuid().nullable());

export const matchSchema = z
  .object({
    played_on: z.iso.date({ message: "Pon la fecha de la partida." }),
    mode_id: optUuid,
    map_name: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() : v) || null,
      z.string().max(40, "Mapa: como mucho 40 caracteres.").regex(/^[^<>]*$/, "Mapa: sin < ni >.").nullable(),
    ),
    character_id: optUuid,
    result: z.preprocess((v) => (v === "" || v == null ? null : v), z.enum(["win", "loss", "draw"]).nullable()),
    placement: z.preprocess(
      (v) => (v === "" || v == null ? null : Number(v)),
      z.number().int().min(1, "Puesto: de 1 a 60.").max(60, "Puesto: de 1 a 60.").nullable(),
    ),
    kills: optInt(200, "Bajas"),
    deaths: optInt(200, "Muertes"),
    assists: optInt(200, "Asistencias"),
    note: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() : v) || null,
      z.string().max(200, "Nota: como mucho 200 caracteres.").regex(/^[^<>]*$/, "Nota: sin < ni >.").nullable(),
    ),
  })
  .refine((m) => m.played_on <= todayInMadrid(), { message: "La fecha no puede ser futura.", path: ["played_on"] });

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
