// GET /api/search?q=<query>
// Proxies to azbry's YouTube search endpoint so the browser never has to
// call a third-party API directly (avoids CORS and keeps the upstream URL
// out of client code, in case it ever needs to change).

export default async function handler(req, res) {
  const q = (req.query.q || "").toString().trim();

  if (!q) {
    res.status(400).json({ status: false, message: "Query kosong." });
    return;
  }

  const upstream = `https://api.azbry.com/api/search/yts?q=${encodeURIComponent(q)}`;

  try {
    const upstreamRes = await fetch(upstream);
    const data = await upstreamRes.json();

    if (!data || data.status === false || !Array.isArray(data.result)) {
      res.status(502).json({ status: false, message: "Upstream tidak mengembalikan hasil." });
      return;
    }

    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    res.status(200).json({ status: true, result: data.result });
  } catch (err) {
    res.status(500).json({ status: false, message: "Gagal menghubungi layanan pencarian." });
  }
}
