import crypto from "crypto";

// Fetches the list of videos already uploaded in your Bunny Stream library,
// so the admin panel can show them without you ever copy-pasting a GUID.
export async function listBunnyVideos() {
  const libraryId = process.env.BUNNY_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;

  const res = await fetch(
    `https://video.bunnycdn.com/library/${libraryId}/videos?page=1&itemsPerPage=100&orderBy=date`,
    { headers: { AccessKey: apiKey, accept: "application/json" }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Bunny API error: ${res.status}`);
  const json = await res.json();

  return (json.items || []).map((v) => ({
    id: v.guid,
    title: v.title,
    status: v.status, // 4 = finished processing / ready to play
    lengthSeconds: v.length,
    thumbnailUrl: `https://${process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE}/${v.guid}/${v.thumbnailFileName || "thumbnail.jpg"}`
  }));
}

// Generates a short-lived, signed Bunny Stream embed URL.
// This is only ever called from a server route AFTER we've confirmed
// in the database that this specific user is enrolled in this specific course.
// The token expires in 2 hours, and is tied to this exact video.
export function getSignedBunnyEmbedUrl(videoId) {
  const libraryId = process.env.BUNNY_LIBRARY_ID;
  const securityKey = process.env.BUNNY_TOKEN_AUTH_KEY;

  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 2; // 2 hour window
  const hashableBase = securityKey + videoId + expires;
  const token = crypto.createHash("sha256").update(hashableBase).digest("hex");

  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}`;
}
