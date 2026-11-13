// Constantes sin textos que también usan los componentes de cliente. Van aparte para que el navegador no cargue los
// traductores de src/lib (y con ellos los dos ficheros de messages/) solo por importar un número.

export const DM_MAX = 1000;

export const FANART_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as const;
export const FANART_MAX_BYTES = 2 * 1024 * 1024;

/** Resultados posibles de una partida (textos en options.matchResults). */
export const MATCH_RESULTS = { win: "win", loss: "loss", draw: "draw" } as const;

/** Redes sociales del perfil: se guarda el usuario y la web construye el enlace. */
export const SOCIALS = {
  social_twitch: { label: "Twitch", url: (h: string) => `https://www.twitch.tv/${h}` },
  social_youtube: { label: "YouTube", url: (h: string) => `https://www.youtube.com/@${h}` },
  social_x: { label: "X", url: (h: string) => `https://x.com/${h}` },
} as const;
