import { z } from "zod";
import type { AppLocale } from "@/lib/i18n/locale";
import { translator } from "@/lib/i18n/translator";
import { AVAILABILITY, CHARACTER_STATUS, GOALS, keys, LANGUAGES, VISIBILITY, VOICE } from "./options";

const visibility = z.enum(keys(VISIBILITY));
const uuid = z.uuid();
const optionalUuid = z.preprocess((v) => (v === "" || v == null ? null : v), uuid.nullable());
const unique = <T>(a: T[]) => new Set(a).size === a.length;

/**
 * Usuario de una red social: se guarda sin «@» y sin URL (la web construye el enlace). Vacío = sin enlace.
 * Ley de Postel: se acepta también el enlace del perfil pegado tal cual y se saca de él el usuario.
 */
const handle = (re: RegExp, message: string, fromUrl: RegExp) =>
  z.preprocess(
    (v) => {
      if (typeof v !== "string") return v;
      const raw = v.trim();
      return (fromUrl.exec(raw)?.[1] ?? raw).replace(/^@/, "") || null;
    },
    z.string().regex(re, message).nullable(),
  );

export { SOCIALS } from "@/lib/limits";

/** Esquema del perfil común con los mensajes en el idioma pedido. */
export function profileSchemaFor(locale: AppLocale) {
  const t = translator(locale, "validation.profile");
  return z.object({
  display_name: z
    .string()
    .trim()
    .min(2, t("nameMin"))
    .max(32, t("nameMax"))
    .regex(/^[^<>]+$/, t("nameChars")),
  languages: z.array(z.enum(keys(LANGUAGES))).max(6, t("languagesMax")).refine(unique),
  availability: z.array(z.enum(keys(AVAILABILITY))).refine(unique),
  goals: z.array(z.enum(keys(GOALS))).refine(unique),
  voice: z.preprocess((v) => (v === "" ? null : v), z.enum(keys(VOICE)).nullable()),
  languages_visibility: visibility,
  availability_visibility: visibility,
  goals_visibility: visibility,
  voice_visibility: visibility,
  social_twitch: handle(
    /^[A-Za-z0-9_]{4,25}$/,
    t("twitch"),
    /^(?:https?:\/\/)?(?:www\.|m\.)?twitch\.tv\/([^/?#\s]+)/i,
  ),
  social_youtube: handle(
    /^[A-Za-z0-9._-]{3,30}$/,
    t("youtube"),
    /^(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/@([^/?#\s]+)/i,
  ),
  social_x: handle(
    /^[A-Za-z0-9_]{1,15}$/,
    t("x"),
    /^(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x|twitter)\.com\/([^/?#\s]+)/i,
  ),
  socials_visibility: visibility,
  dm_policy: z.enum(["registered", "none"]),
  });
}

export const profileSchema = profileSchemaFor("es");

/** Esquema del perfil de un juego con los mensajes en el idioma pedido. */
export function gameProfileSchemaFor(locale: AppLocale) {
  const t = translator(locale, "validation.profile");
  return z
  .object({
    rank_id: optionalUuid,
    region_id: optionalUuid,
    flex: z.boolean(),
    visibility,
    roles: z.array(uuid).max(4).refine(unique),
    modes: z.array(z.string().regex(/^[a-z0-9-]{1,32}$/)).max(10).refine(unique),
    primary_role: optionalUuid,
    characters: z
      .array(z.object({ character_id: uuid, status: z.enum(keys(CHARACTER_STATUS)) }))
      .max(40)
      .refine((a) => unique(a.map((c) => c.character_id)), t("characterRepeated")),
  })
  .refine((v) => !v.primary_role || v.roles.includes(v.primary_role), {
    message: t("primaryRole"),
    path: ["primary_role"],
  });
}

export const gameProfileSchema = gameProfileSchemaFor("es");

export type ProfileInput = z.infer<typeof profileSchema>;
export type GameProfileInput = z.infer<typeof gameProfileSchema>;

/** Convierte el FormData del formulario de perfil en un objeto validable. */
export function profileFromForm(fd: FormData) {
  return {
    display_name: fd.get("display_name"),
    languages: fd.getAll("languages"),
    availability: fd.getAll("availability"),
    goals: fd.getAll("goals"),
    voice: fd.get("voice") ?? "",
    languages_visibility: fd.get("languages_visibility"),
    availability_visibility: fd.get("availability_visibility"),
    goals_visibility: fd.get("goals_visibility"),
    voice_visibility: fd.get("voice_visibility"),
    social_twitch: fd.get("social_twitch") ?? "",
    social_youtube: fd.get("social_youtube") ?? "",
    social_x: fd.get("social_x") ?? "",
    socials_visibility: fd.get("socials_visibility") ?? "registered",
    dm_policy: fd.get("dm_policy") ?? "registered",
  };
}

/** Los agentes llegan como `char:<uuid>` = estado ("" = no lo juega). */
export function gameProfileFromForm(fd: FormData) {
  const characters: { character_id: string; status: string }[] = [];
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("char:") && typeof v === "string" && v !== "") {
      characters.push({ character_id: k.slice(5), status: v });
    }
  }
  return {
    rank_id: fd.get("rank_id") ?? "",
    region_id: fd.get("region_id") ?? "",
    flex: fd.get("flex") === "on",
    visibility: fd.get("game_visibility"),
    roles: fd.getAll("roles"),
    modes: fd.getAll("modes"),
    primary_role: fd.get("primary_role") ?? "",
    characters,
  };
}

/** Porcentaje de perfil completado: ayuda a completarlo poco a poco. */
export function profileCompletion(p: {
  languages: string[];
  availability: string[];
  goals: string[];
  voice: string | null;
  rank_id: string | null;
  region_id: string | null;
  roles: number;
  /** null: el juego no tiene personajes (p. ej. CS2) y no cuenta para el porcentaje. */
  characters: number | null;
  characterLabel?: string;
}) {
  const checks = {
    Idiomas: p.languages.length > 0,
    Horarios: p.availability.length > 0,
    Objetivos: p.goals.length > 0,
    Comunicación: p.voice != null,
    Rango: p.rank_id != null,
    Servidor: p.region_id != null,
    Roles: p.roles > 0,
    ...(p.characters == null ? {} : { [p.characterLabel ?? "Agentes"]: p.characters > 0 }),
  };
  const done = Object.values(checks).filter(Boolean).length;
  const missing = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);
  return { percent: Math.round((done / Object.keys(checks).length) * 100), missing };
}
