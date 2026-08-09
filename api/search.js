// GET /api/search?q=<query>
// PRIMARY search source: Spotify's own internal "pathfinder" GraphQL API.
//
// Unlike the previous version, this does NOT rely on a manually-copied
// bearer token that expires every hour or so. Instead it replicates how
// open.spotify.com's own web player authenticates itself:
//   1. Generate a TOTP code (same algorithm Spotify's client uses as an
//      anti-bot check) and use it to fetch a short-lived access token from
//      open.spotify.com/api/token.
//   2. Exchange that for a client-token from clienttoken.spotify.com.
//   3. Use both to call the pathfinder search API.
//
// The resulting token pair is cached in-memory (module scope) for its
// actual lifetime, so most requests don't re-run this handshake at all —
// only the first request per cold start, or once the cached token expires.
//
// ⚠️ This still isn't a public/documented API. Spotify could change the
// TOTP secret/version or the persisted-query hash at any time, which would
// break this the same way the old token did — just hopefully far less
// often, since this mirrors the real client instead of a copy-pasted token.
// If SPOTIFY_BEARER / SPOTIFY_CLIENT_TOKEN env vars are set, they're used
// as a manual override/last-resort fallback if the auto handshake fails.

import crypto from "node:crypto";

const TOTP_SECRET = "376136387538459893883312310911992847112448894410210511297108";
const TOTP_VERSION = "61";
const CLIENT_VERSION = "1.2.88.61.ge172202b";
const SEARCH_SHA256 = "21b3fe49546912ba782db5c47e9ef5a7dbd20329520ba0c7d0fcfadee671d24e";

const BROWSER_HEADERS = {
  referer: "https://open.spotify.com/",
  origin: "https://open.spotify.com",
  accept: "application/json",
  "user-agent":
    "Mozilla/5.0 (Linux; Android 16; NX729J) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.34 Mobile Safari/537.36"
};

// module-scope cache — survives across requests on the same warm serverless instance
let cachedAuth = null; // { bearer, clientToken, expiresAt }

function generateTOTP(tsMs) {
  const counter = Math.floor(Math.floor(tsMs / 1000) / 30);
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", Buffer.from(TOTP_SECRET, "utf8")).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, "0");
}

async function fetchFreshAuth() {
  const nowMs = Date.now();
  const stsSeconds = Math.floor(nowMs / 1000);

  const tokenRes = await fetch(
    "https://open.spotify.com/api/token?" +
      new URLSearchParams({
        reason: "init",
        productType: "web-player",
        totp: generateTOTP(nowMs),
        totpServer: generateTOTP(stsSeconds * 1000),
        totpVer: TOTP_VERSION
      }),
    { headers: BROWSER_HEADERS }
  );
  if (!tokenRes.ok) throw new Error(`token endpoint HTTP ${tokenRes.status}`);
  const token = await tokenRes.json();
  if (!token.accessToken || !token.clientId) throw new Error("token endpoint returned no accessToken/clientId");

  const clientTokenRes = await fetch("https://clienttoken.spotify.com/v1/clienttoken", {
    method: "POST",
    headers: { ...BROWSER_HEADERS, "content-type": "application/json" },
    body: JSON.stringify({
      client_data: {
        client_version: CLIENT_VERSION,
        client_id: token.clientId,
        js_sdk_data: {
          device_brand: "unknown",
          device_model: "unknown",
          os: "linux",
          os_version: "24.04",
          device_id: crypto.randomUUID(),
          device_type: "computer"
        }
      }
    })
  });
  if (!clientTokenRes.ok) throw new Error(`clienttoken endpoint HTTP ${clientTokenRes.status}`);
  const clientData = await clientTokenRes.json();
  const clientToken = clientData?.granted_token?.token;
  if (!clientToken) throw new Error("clienttoken endpoint returned no token");

  // token.accessTokenExpirationTimestampMs tells us exactly when this dies;
  // refresh a bit early to be safe.
  const expiresAt = (token.accessTokenExpirationTimestampMs || Date.now() + 55 * 60 * 1000) - 60_000;

  return { bearer: token.accessToken, clientToken, expiresAt };
}

async function getAuth() {
  if (cachedAuth && cachedAuth.expiresAt > Date.now()) return cachedAuth;
  cachedAuth = await fetchFreshAuth();
  return cachedAuth;
}

function formatDuration(ms) {
  if (!ms || !Number.isFinite(ms)) return null;
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function idFromUri(uri) {
  return uri?.split(":")?.[2] || null;
}

function normalizeTrack(t) {
  const id = idFromUri(t?.uri);
  if (!id || !t?.name) return null;

  const artist = (t.artists?.items || [])
    .map((a) => a?.profile?.name)
    .filter(Boolean)
    .join(", ");

  const thumbnail = t.albumOfTrack?.coverArt?.sources?.slice(-1)[0]?.url || null;

  return {
    videoId: id, // kept as "videoId" for compatibility with the rest of the app; this is the Spotify track ID
    title: t.name,
    artist: artist || null,
    thumbnail,
    duration: formatDuration(t.duration?.totalMilliseconds),
    url: `https://open.spotify.com/track/${id}`
  };
}

async function searchSpotify(q, auth) {
  const res = await fetch("https://api-partner.spotify.com/pathfinder/v2/query", {
    method: "POST",
    headers: {
      ...BROWSER_HEADERS,
      "content-type": "application/json;charset=UTF-8",
      "accept-language": "id",
      "app-platform": "WebPlayer",
      "spotify-app-version": CLIENT_VERSION,
      authorization: `Bearer ${auth.bearer}`,
      "client-token": auth.clientToken
    },
    body: JSON.stringify({
      variables: {
        searchTerm: q,
        offset: 0,
        limit: 40,
        numberOfTopResults: 10,
        includeAudiobooks: false,
        includeArtistHasConcertsField: false,
        includePreReleases: true,
        includeAuthors: false,
        includeEpisodeContentRatingsV2: false
      },
      operationName: "searchDesktop",
      extensions: { persistedQuery: { version: 1, sha256Hash: SEARCH_SHA256 } }
    })
  });

  if (res.status === 401 || res.status === 403) {
    const err = new Error(`auth rejected (HTTP ${res.status})`);
    err.authFailure = true;
    throw err;
  }
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`pathfinder HTTP ${res.status}: ${bodyText.slice(0, 300)}`);
  }

  const data = await res.json();
  if (data?.errors?.length) {
    throw new Error(data.errors[0]?.message || "Spotify GraphQL error");
  }

  const searchV2 = data?.data?.searchV2;
  const trackItems = searchV2?.tracksV2?.items?.length
    ? searchV2.tracksV2.items.map((n) => n.data)
    : (searchV2?.topResultsV2?.itemsV2 || [])
        .filter((n) => n.item?.__typename === "TrackResponseWrapper")
        .map((n) => n.item.data);

  return trackItems.map(normalizeTrack).filter(Boolean);
}

export default async function handler(req, res) {
  const q = (req.query.q || "").toString().trim();
  if (!q) {
    res.status(400).json({ status: false, message: "Query kosong." });
    return;
  }

  try {
    const auth = await getAuth();
    const result = await searchSpotify(q, auth);
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json({ status: true, result });
    return;
  } catch (err) {
    console.error("[api/search] auto-auth flow failed:", err.message);
    cachedAuth = null; // don't keep a possibly-bad cached token around

    // last-resort fallback: manually-provided env var tokens, if set
    const fallbackBearer = process.env.SPOTIFY_BEARER;
    const fallbackClientToken = process.env.SPOTIFY_CLIENT_TOKEN;
    if (fallbackBearer && fallbackClientToken) {
      try {
        const result = await searchSpotify(q, { bearer: fallbackBearer, clientToken: fallbackClientToken });
        res.status(200).json({ status: true, result });
        return;
      } catch (fallbackErr) {
        console.error("[api/search] fallback env-var tokens also failed:", fallbackErr.message);
      }
    }

    res.status(502).json({
      status: false,
      message: "Gagal autentikasi ke Spotify. Kemungkinan Spotify mengubah mekanisme TOTP/hash query mereka."
    });
  }
}
