export default async function handler(req, res) {
  const url = (req.query.url || "").toString().trim();
  if (!url) {
    res.status(400).json({ status: false, message: "URL kosong." });
    return;
  }

  try {
    const upstreamRes = await fetch(
      `https://myspoty.app/api.php?action=lookup&u=${encodeURIComponent(url)}`,
      { headers: { Accept: "application/json" } }
    );
    const data = await upstreamRes.json().catch(() => ({}));

    if (data.error || !data.download) {
      res.status(502).json({ status: false, message: "Gagal mengambil data dari myspoty." });
      return;
    }

    res.status(200).json({
      status: true,
      audioUrl: data.download,
      title: data.title || null,
      artist: data.artist || null,
      thumbnail: data.cover || null
    });
  } catch (err) {
    res.status(500).json({ status: false, message: "Gagal menghubungi myspoty." });
  }
}
