import { describe, expect, it } from "vitest";
import { embedUrl, parseClipUrl, sourceUrl } from "@/lib/clips/links";

describe("parseClipUrl", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s", "youtube", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/shorts/dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ"],
    ["https://clips.twitch.tv/FunnyClipSlug-abc123", "twitch", "FunnyClipSlug-abc123"],
    ["https://www.twitch.tv/streamer/clip/FunnyClipSlug-abc123?filter=clips", "twitch", "FunnyClipSlug-abc123"],
    ["https://streamable.com/abc12x", "streamable", "abc12x"],
  ])("%s", (url, provider, videoId) => {
    expect(parseClipUrl(url)).toEqual({ provider, videoId });
  });

  it.each([
    "https://example.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=corto",
    "javascript:alert(1)",
    "https://www.twitch.tv/streamer",
    "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ",
    "no es un enlace",
  ])("rechaza %s", (url) => {
    expect(parseClipUrl(url)).toBeNull();
  });
});

describe("embedUrl y sourceUrl", () => {
  it("construye las URL de cada proveedor", () => {
    expect(embedUrl({ provider: "youtube", videoId: "dQw4w9WgXcQ" }, "x")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0");
    expect(embedUrl({ provider: "twitch", videoId: "Slug-1" }, "teamfinder-seven.vercel.app")).toBe(
      "https://clips.twitch.tv/embed?clip=Slug-1&parent=teamfinder-seven.vercel.app&autoplay=false",
    );
    expect(sourceUrl({ provider: "streamable", videoId: "abc12x" })).toBe("https://streamable.com/abc12x");
  });
});
