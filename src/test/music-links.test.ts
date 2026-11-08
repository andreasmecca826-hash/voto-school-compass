import { describe, expect, it } from "vitest";
import { parseSpotifyLink, spotifyEmbedUrl } from "@/lib/voto/music-links";

const trackId = "0VjIjW4GlUZAMYd2vXMi3b";

describe("link Spotify", () => {
  it.each(["track", "album", "artist", "episode", "playlist", "show"] as const)(
    "riconosce link Spotify di tipo %s",
    (type) => {
      expect(parseSpotifyLink(`https://open.spotify.com/${type}/${trackId}?si=share-code`)).toEqual(
        {
          type,
          id: trackId,
        },
      );
    },
  );

  it("riconosce i link localizzati e quelli già in formato embed", () => {
    expect(parseSpotifyLink(`https://open.spotify.com/intl-it/track/${trackId}`)).toEqual({
      type: "track",
      id: trackId,
    });
    expect(parseSpotifyLink(`https://open.spotify.com/embed/playlist/${trackId}`)).toEqual({
      type: "playlist",
      id: trackId,
    });
  });

  it("produce l’URL del player incorporato Spotify", () => {
    expect(spotifyEmbedUrl({ type: "track", id: trackId })).toBe(
      `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`,
    );
  });

  it.each([
    `http://open.spotify.com/track/${trackId}`,
    `https://spotify.com/track/${trackId}`,
    `https://open.spotify.com.evil.example/track/${trackId}`,
    "https://open.spotify.com/track/not-a-spotify-id",
    `https://open.spotify.com/user/example/playlist/${trackId}`,
  ])("rifiuta URL non supportati: %s", (url) => {
    expect(parseSpotifyLink(url)).toBeNull();
  });
});
