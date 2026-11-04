// Opciones de perfil comunes a todos los juegos. Deben coincidir con los CHECK de la migración.

export const LANGUAGES = {
  es: "Español",
  en: "Inglés",
  pt: "Portugués",
  fr: "Francés",
  de: "Alemán",
  it: "Italiano",
  ca: "Catalán",
  eu: "Euskera",
  gl: "Gallego",
} as const;

export const AVAILABILITY = {
  weekday_morning: "Entre semana · mañana",
  weekday_afternoon: "Entre semana · tarde",
  weekday_evening: "Entre semana · noche",
  weekday_night: "Entre semana · madrugada",
  weekend_morning: "Fin de semana · mañana",
  weekend_afternoon: "Fin de semana · tarde",
  weekend_evening: "Fin de semana · noche",
  weekend_night: "Fin de semana · madrugada",
} as const;

export const GOALS = {
  ranked: "Competitivo",
  casual: "Casual",
  improve: "Entrenar y mejorar",
  fun: "Por diversión",
  meet: "Conocer gente",
} as const;

export const VOICE = {
  voice: "Uso micro",
  listen: "Escucho, hablo poco",
  text: "Solo chat de texto",
} as const;

export const VISIBILITY = {
  public: "Público",
  registered: "Solo usuarios registrados",
  private: "Solo yo",
} as const;

export const CHARACTER_STATUS = {
  main: "Main",
  comfort: "Comfort pick",
  playable: "Playable",
  flexible: "Flexible",
} as const;

export type Language = keyof typeof LANGUAGES;
export type Availability = keyof typeof AVAILABILITY;
export type Goal = keyof typeof GOALS;
export type Voice = keyof typeof VOICE;
export type Visibility = keyof typeof VISIBILITY;
export type CharacterStatus = keyof typeof CHARACTER_STATUS;

export const keys = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];
