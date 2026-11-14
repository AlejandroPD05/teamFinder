import { z } from "zod";
import type { AppLocale } from "@/lib/i18n/locale";
import { translator } from "@/lib/i18n/translator";

// Ideas públicas (/ideas): las publica moderación, la comunidad las vota y ve su estado (docs/PROMPT.md §7.2).

export const IDEA_STATUSES = ["in_progress", "pending", "done", "declined"] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];

export type PublicIdea = {
  id: string;
  title: string;
  body: string | null;
  status: IdeaStatus;
  votes: number;
  voted: boolean;
  created_at: string;
  updated_at: string;
};

/** Solo se votan las que siguen abiertas. */
export const isVotable = (s: IdeaStatus) => s === "pending" || s === "in_progress";

/** Agrupa por estado (en desarrollo primero) y ordena: abiertas por votos, cerradas por la última actualización. */
export function groupIdeas(ideas: PublicIdea[]) {
  return IDEA_STATUSES.map((status) => ({
    status,
    ideas: ideas
      .filter((i) => i.status === status)
      .sort((a, b) =>
        isVotable(status) ? b.votes - a.votes || b.created_at.localeCompare(a.created_at) : b.updated_at.localeCompare(a.updated_at),
      ),
  })).filter((g) => g.ideas.length > 0);
}

export function ideaSchemaFor(locale: AppLocale) {
  const t = translator(locale, "ideas");
  return z.object({
    title: z.string().trim().min(5, t("titleLength")).max(80, t("titleLength")).regex(/^[^<>]*$/, t("chars")),
    body: z.string().trim().max(500, t("bodyLength")).regex(/^[^<>]*$/, t("chars")),
    status: z.enum(["pending", "in_progress", "done", "declined"]),
  });
}
