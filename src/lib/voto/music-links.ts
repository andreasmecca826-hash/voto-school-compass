export const SPOTIFY_RESOURCE_TYPES = [
  "album",
  "artist",
  "episode",
  "playlist",
  "show",
  "track",
] as const;

export type SpotifyResourceType = (typeof SPOTIFY_RESOURCE_TYPES)[number];

export type SpotifyResource = {
  type: SpotifyResourceType;
  id: string;
};

const spotifyResourceTypes = new Set<string>(SPOTIFY_RESOURCE_TYPES);
const spotifyIdPattern = /^[A-Za-z0-9]{22}$/;

export function parseSpotifyLink(value: string): SpotifyResource | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "open.spotify.com") return null;

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments[0]?.startsWith("intl-")) segments.shift();
    if (segments[0] === "embed") segments.shift();

    const type = segments[0];
    const id = segments[1];
    if (!type || !id || !spotifyResourceTypes.has(type) || !spotifyIdPattern.test(id)) return null;

    return { type: type as SpotifyResourceType, id };
  } catch {
    return null;
  }
}

export function spotifyEmbedUrl(resource: SpotifyResource): string {
  return `https://open.spotify.com/embed/${resource.type}/${encodeURIComponent(resource.id)}?utm_source=generator&theme=0`;
}
