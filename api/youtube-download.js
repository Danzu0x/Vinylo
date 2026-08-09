// GET /api/youtube-download?url=<youtube url>
// LAST-RESORT FALLBACK ONLY. Same azbry ytmp3 proxy as before, now only
// invoked after both Spotify download routes have failed.

export default async function handler(req, res) {
  const url = (req.query.url || "").toString().trim();

  if (!url) {
    res.status(400).json({ status: false, message: "URL kosong." });
    return;
  }

  const upstream = `https://api.azbry.com/api/download/ytmp3?url=${encodeURIComponent(url)}`;

  try {
    const upstreamRes = await fetch(upstream);
    const data = await upstreamRes.json();

    if (!data || data.status === false) {
      res.status(502).json({ status: false, message: "Upstream gagal memproses lagu ini." });
      return;
    }

    const result = data.result || data;

    // `download` is the direct mp3 link. `url` is just the YouTube watch
    // page (kept for reference), so it must NOT be checked before the
    // actual audio fields below.
    const audioUrl =
      result.download ||
      result.downloadUrl ||
      result.download_url ||
      result.mp3 ||
      result.audio ||
      result.link ||
      null;

    if (!audioUrl) {
      res.status(502).json({
        status: false,
        message: "Tidak menemukan link audio pada respons upstream.",
        raw: result
      });
      return;
    }

    res.status(200).json({
      status: true,
      audioUrl,
      title: result.title || null,
      thumbnail: result.thumbnail || null,
      duration: result.duration || null
    });
  } catch (err) {
    res.status(500).json({ status: false, message: "Gagal menghubungi layanan unduh." });
  }
}
