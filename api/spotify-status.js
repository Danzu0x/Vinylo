// GET /api/spotify-status?jobId=<id>
// One poll of a spotyloader job. The frontend calls this on an interval
// (see PlayerContext) rather than us looping server-side, so each request
// stays fast and well within any serverless timeout.

const BASE = "https://spotyloader.com";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://spotyloader.com/"
};

export default async function handler(req, res) {
  const jobId = (req.query.jobId || "").toString();
  if (!jobId) {
    res.status(400).json({ status: false, message: "jobId kosong." });
    return;
  }

  try {
    const upstreamRes = await fetch(`${BASE}/api/spotify/track/status/${jobId}`, { headers: HEADERS });
    const data = await upstreamRes.json().catch(() => ({}));

    if (data.status === "ready" && data.downloadLink) {
      res.status(200).json({ status: true, state: "ready", audioUrl: data.downloadLink });
      return;
    }
    if (data.status === "error") {
      res.status(200).json({ status: true, state: "error" });
      return;
    }
    res.status(200).json({ status: true, state: "pending" });
  } catch (err) {
    res.status(500).json({ status: false, message: "Gagal cek status job." });
  }
}
