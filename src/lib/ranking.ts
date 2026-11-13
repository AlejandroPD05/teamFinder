// Ranking semanal comunitario (migración 20261116000000_weekly_ranking.sql). Las reglas se muestran tal cual en
// /ranking: si cambian aquí, cambian también en la función de la base de datos.

export const RANKING_RULES = {
  pointsPerRecognition: 3,
  pointsPerFinished: 1,
  minFinished: 3,
  topSize: 10,
} as const;

export type RankTier = "top1" | "podium" | "top10";

export function rankTier(pos: number): RankTier {
  return pos === 1 ? "top1" : pos <= 3 ? "podium" : "top10";
}

export const TIER_LABEL: Record<RankTier, string> = {
  top1: "Top 1 semanal",
  podium: "Podio semanal",
  top10: "Top 10 semanal",
};

const day = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });

/** «del 10 nov al 16 nov» para una semana que empieza en `weekStart` (AAAA-MM-DD, lunes). */
export function weekLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  return `del ${day.format(start)} al ${day.format(end)}`;
}

/** Lunes de la semana actual en España, como AAAA-MM-DD. */
export function currentWeekStart(now = new Date()): string {
  const madrid = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  const dow = (madrid.getDay() + 6) % 7; // 0 = lunes
  const monday = new Date(Date.UTC(madrid.getFullYear(), madrid.getMonth(), madrid.getDate() - dow));
  return monday.toISOString().slice(0, 10);
}

/** Días que faltan para que cierre la semana (domingo a medianoche, hora de España). */
export function daysLeft(now = new Date()): number {
  const madrid = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  return 7 - ((madrid.getDay() + 6) % 7);
}
