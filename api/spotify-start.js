// POST /api/spotify-start   body: { url }
// Kicks off a spotyloader.com conversion job and returns immediately with
// a jobId. Deliberately kept fast/non-blocking (no polling in here) since
// serverless functions have execution time limits and a job can realistically
// take anywhere from ~8s to over a minute — polling happens client-side via
// /api/spotify-status instead.

const BASE = "https://spotyloader.com";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://spotyloader.com/"
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ status: false, message: "Method not allowed." });
    return;
  }

  const { url } = req.body || {};
  if (!url) {
    res.status(400).json({ status: false, message: "URL kosong." });
    return;
  }

  try {
    const upstreamRes = await fetch(`${BASE}/api/spotify/track`, {
      method: "POST",
      headers: { ...HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ url, format: "mp3" })
    });
    const data = await upstreamRes.json().catch(() => ({}));

    if (!data.jobId) {
      res.status(502).json({ status: false, message: "Gagal membuat job download di spotyloader." });
      return;
    }

    res.status(200).json({ status: true, jobId: data.jobId });
  } catch (err) {
    res.status(500).json({ status: false, message: "Gagal menghubungi spotyloader." });
  }
}
