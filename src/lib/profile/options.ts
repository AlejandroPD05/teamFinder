// Opciones de perfil comunes a todos los juegos. Deben coincidir con los CHECK de la migración.
// Solo las claves: los textos están en messages/*.json (options.languages, options.availability…).

const set = <K extends string>(...k: K[]) => Object.fromEntries(k.map((x) => [x, x])) as { readonly [P in K]: P };

export const LANGUAGES = set("es", "en", "pt", "fr", "de", "it", "ca", "eu", "gl");

export const AVAILABILITY = set(
  "weekday_morning",
  "weekday_afternoon",
  "weekday_evening",
  "weekday_night",
  "weekend_morning",
  "weekend_afternoon",
  "weekend_evening",
  "weekend_night",
);

export const GOALS = set("ranked", "casual", "improve", "fun", "meet");

export const VOICE = set("voice", "listen", "text");

export const VISIBILITY = set("public", "registered", "private");

export const CHARACTER_STATUS = set("main", "comfort", "playable", "flexible");

export type Language = keyof typeof LANGUAGES;
export type Availability = keyof typeof AVAILABILITY;
export type Goal = keyof typeof GOALS;
export type Voice = keyof typeof VOICE;
export type Visibility = keyof typeof VISIBILITY;
export type CharacterStatus = keyof typeof CHARACTER_STATUS;

export const keys = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

/** Claves de un diccionario de opciones, en orden. */
export const optionKeys = <T extends Record<string, string>>(o: T) => Object.keys(o) as (keyof T & string)[];
