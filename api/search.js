// GET /api/search?q=<query>
// PRIMARY search source: Spotify's own internal "pathfinder" GraphQL API
// (the same one open.spotify.com's web player uses). This is NOT a public,
// documented API — it's authenticated with a bearer token + client-token
// scraped from a real browser session, which Spotify issues short-lived.
//
// ⚠️ THESE TOKENS WILL EXPIRE. When that happens this endpoint starts
// returning errors and results dry up. Grab a fresh pair (open Spotify
// Web Player devtools → Network tab → filter "pathfinder" → copy the
// `authorization` and `client-token` request headers) and update the
// SPOTIFY_BEARER / SPOTIFY_CLIENT_TOKEN environment variables in Vercel
// (Project → Settings → Environment Variables), then redeploy. No code
// changes needed for a token refresh.

const DEFAULT_BEARER =
  "BQCyjxgvXA4KbMNSpp7C4jPwpdCfj7ttvA-dzgbS73KzI1VZ3MFMTPGFQX-4BwcTzBJbkHF7xaUy3TZfrbDeCrY2q1HizFia6VOV2Z1diw2Nucw5Ta7_Bd8fcHwyVKdGmWZbhPL2LdJC";
const DEFAULT_CLIENT_TOKEN =
  "AAGVWUGDbqu9Ja94LK01gSAyNDYO3k2yIm8WvpNapNQyO3tDBIvjFljyPO2/fKiarig1HVOkjG5Y4n9eWPiixcvdiksIGmMZWmWyWw5TAzbgaJO1p6rAOrpz+bAUkfRcecvGAK0+YMmVdA7YttWmzMd96UzTASN4hmbpWbTP08PBzTMXBGYZGFjM8ZE2Dplzymb9ufBYddJHmrQ52fl5tMmk3HWND7qKysyUckr/7Sa3z++cbbOnVqV+slno+he5qfDAepPqBAgX5Zj4Ub5uCkSkPQMaxY7oT16x2L0kiGCVvCEL/gw4DUUGjgYU228ukthYbSekSvc7zbByRe5Lza8cAK4RMks=";

function formatDuration(ms) {
  if (!ms || !Number.isFinite(ms)) return null;
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function normalizeItem(entry) {
  const track = entry?.item?.data;
  if (!track?.id || !track?.name || !track?.artists?.items) return null;

  const artist = track.artists.items
    .map((a) => a?.profile?.name)
    .filter(Boolean)
    .join(", ");

  const thumbnail = track.albumOfTrack?.coverArt?.sources?.slice(-1)[0]?.url || null;
  const durationMs = track.duration?.totalMilliseconds ?? track.duration?.milliseconds ?? null;

  return {
    videoId: track.id, // kept as "videoId" for compatibility with the rest of the app; this is actually the Spotify track ID
    title: track.name,
    artist: artist || null,
    thumbnail,
    duration: formatDuration(durationMs),
    url: `https://open.spotify.com/track/${track.id}`
  };
}

export default async function handler(req, res) {
  const q = (req.query.q || "").toString().trim();

  if (!q) {
    res.status(400).json({ status: false, message: "Query kosong." });
    return;
  }

  const bearer = process.env.SPOTIFY_BEARER || DEFAULT_BEARER;
  const clientToken = process.env.SPOTIFY_CLIENT_TOKEN || DEFAULT_CLIENT_TOKEN;

  try {
    const upstreamRes = await fetch("https://api-partner.spotify.com/pathfinder/v2/query", {
      method: "POST",
      headers: {
        accept: "application/json",
        "accept-language": "id",
        authorization: `Bearer ${bearer}`,
        "client-token": clientToken,
        "content-type": "application/json;charset=UTF-8"
      },
      body: JSON.stringify({
        variables: {
          query: q,
          numberOfTopResults: 20,
          includePreReleases: true,
          includeAlbumPreReleases: true
        },
        operationName: "findTopResults",
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: "903df2a65d8121e27d73a2be03c01e88ebe6021bb6d4eb82a389e35d87e51d27"
          }
        }
      })
    });

    if (upstreamRes.status === 401 || upstreamRes.status === 403) {
      res.status(502).json({
        status: false,
        message: "Token Spotify sudah kedaluwarsa. Perbarui SPOTIFY_BEARER / SPOTIFY_CLIENT_TOKEN."
      });
      return;
    }

    const data = await upstreamRes.json();
    const items = data?.data?.searchV2?.topResultsV2?.itemsV2 || [];
    const result = items.map(normalizeItem).filter(Boolean);

    if (!result.length) {
      res.status(200).json({ status: true, result: [] });
      return;
    }

    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    res.status(200).json({ status: true, result });
  } catch (err) {
    res.status(500).json({ status: false, message: "Gagal menghubungi pencarian Spotify." });
  }
}
