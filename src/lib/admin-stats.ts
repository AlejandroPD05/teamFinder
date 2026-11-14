/** Recuentos de `admin_stats` (moderación). Solo agregados: ningún dato de una persona. */
export type AdminStats = {
  users: number; users_7d: number; users_30d: number; active_7d: number; onboarded: number;
  lobbies_7d: number; lobbies_30d: number; filled_30d: number; requests_30d: number; karma_30d: number;
  teams: number; clips_30d: number; messages_7d: number; saved_searches: number; push_users: number;
  email_users: number; feedback_new: number;
  games: { game_id: string; name: string; profiles: number; lobbies_30d: number }[];
  db_bytes: number; storage_bytes: number; seen_30d: number; emails_today: number; inactive_60d: number;
  discord_lobbies_7d: number;
};

/** Porcentaje entero, o null si no hay base. */
export const pct = (part: number, total: number) => (total > 0 ? Math.round((100 * part) / total) : null);

/**
 * Límites de los planes gratuitos que usa la web (consultados el 2026-11-14 en supabase.com/pricing,
 * supabase.com/docs/guides/platform/billing-on-supabase y brevo.com). Si cambian, se actualizan aquí.
 */
export const FREE_LIMITS = {
  dbBytes: 500 * 1024 ** 2,
  storageBytes: 1024 ** 3,
  monthlyUsers: 50_000,
  emailsPerDay: 300,
} as const;

/** Desde qué porcentaje de uso se avisa en la página. */
export const USAGE_WARN_PCT = 80;

/** Uso frente a un límite: porcentaje (con un decimal si es menos del 1 %) y si toca avisar. */
export function usage(used: number, limit: number) {
  const ratio = limit > 0 ? used / limit : 0;
  const percent = ratio * 100;
  return { percent: percent < 1 ? Math.round(percent * 10) / 10 : Math.round(percent), warn: percent >= USAGE_WARN_PCT };
}

/** Tamaño legible en MB o GB. */
export function formatBytes(bytes: number, locale: string) {
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return bytes >= 1024 ** 3 ? `${n.format(bytes / 1024 ** 3)} GB` : `${n.format(bytes / 1024 ** 2)} MB`;
}
