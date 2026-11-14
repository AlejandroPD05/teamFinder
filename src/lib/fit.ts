/**
 * «Te pueden encajar»: la base de datos (`suggested_players`) devuelve, para cada jugador, los motivos concretos por
 * los que encaja contigo. Aquí solo se validan y ordenan para enseñarlos; no hay puntuación oculta.
 */
export const FIT_REASONS = ["role", "region", "schedule", "rank", "language"] as const;
export type FitReason = (typeof FIT_REASONS)[number];

export function fitReasons(raw: readonly string[] | null | undefined): FitReason[] {
  const set = new Set(raw ?? []);
  return FIT_REASONS.filter((r) => set.has(r));
}
