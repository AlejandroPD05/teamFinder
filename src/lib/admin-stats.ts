/** Recuentos de `admin_stats` (moderación). Solo agregados: ningún dato de una persona. */
export type AdminStats = {
  users: number; users_7d: number; users_30d: number; active_7d: number; onboarded: number;
  lobbies_7d: number; lobbies_30d: number; filled_30d: number; requests_30d: number; karma_30d: number;
  teams: number; clips_30d: number; messages_7d: number; saved_searches: number; push_users: number;
  email_users: number; feedback_new: number;
  games: { game_id: string; name: string; profiles: number; lobbies_30d: number }[];
};

/** Porcentaje entero, o null si no hay base. */
export const pct = (part: number, total: number) => (total > 0 ? Math.round((100 * part) / total) : null);
