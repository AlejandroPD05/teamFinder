// Enlaces de clips admitidos. Solo se guarda proveedor + id; el reproductor lo construye la web (nunca una URL libre).

export type ClipProvider = "youtube" | "twitch" | "streamable";
export type ClipRef = { provider: ClipProvider; videoId: string };

export const PROVIDER_NAMES: Record<ClipProvider, string> = {
  youtube: "YouTube",
  twitch: "Twitch",
  streamable: "Streamable",
};

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const TWITCH_SLUG = /^[A-Za-z0-9_-]{4,100}$/;
const STREAMABLE_ID = /^[a-z0-9]{4,12}$/;

/** Reconoce enlaces de YouTube (vídeo, Shorts, youtu.be), clips de Twitch y Streamable. Si no, null. */
export function parseClipUrl(input: string): ClipRef | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^(www|m)\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const id = parts[0] === "watch" ? url.searchParams.get("v") : ["shorts", "embed", "live"].includes(parts[0]) ? parts[1] : null;
    return id && YT_ID.test(id) ? { provider: "youtube", videoId: id } : null;
  }
  if (host === "youtu.be") {
    return parts[0] && YT_ID.test(parts[0]) ? { provider: "youtube", videoId: parts[0] } : null;
  }
  if (host === "clips.twitch.tv") {
    const slug = parts[0] === "embed" ? url.searchParams.get("clip") : parts[0];
    return slug && TWITCH_SLUG.test(slug) ? { provider: "twitch", videoId: slug } : null;
  }
  if (host === "twitch.tv" && parts[1] === "clip" && parts[2] && TWITCH_SLUG.test(parts[2])) {
    return { provider: "twitch", videoId: parts[2] };
  }
  if (host === "streamable.com") {
    const id = parts[0] === "e" ? parts[1] : parts[0];
    return id && STREAMABLE_ID.test(id) ? { provider: "streamable", videoId: id } : null;
  }
  return null;
}

/** URL del reproductor incrustado. Twitch exige el dominio de la web que lo incrusta (`parent`). */
export function embedUrl(ref: ClipRef, parentHost: string): string {
  switch (ref.provider) {
    case "youtube":
      return `https://www.youtube-nocookie.com/embed/${ref.videoId}?rel=0`;
    case "twitch":
      return `https://clips.twitch.tv/embed?clip=${encodeURIComponent(ref.videoId)}&parent=${encodeURIComponent(parentHost)}&autoplay=false`;
    case "streamable":
      return `https://streamable.com/e/${ref.videoId}`;
  }
}

/** Enlace para ver el clip en su web original. */
export function sourceUrl(ref: ClipRef): string {
  switch (ref.provider) {
    case "youtube":
      return `https://www.youtube.com/watch?v=${ref.videoId}`;
    case "twitch":
      return `https://clips.twitch.tv/${ref.videoId}`;
    case "streamable":
      return `https://streamable.com/${ref.videoId}`;
  }
}
