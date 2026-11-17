const C = {};
module.exports = async (req, res) => {
  const h = String((req.query && req.query.h) || '').replace(/[^\w.-]/g, '');
  if (!h) return res.status(400).json({ id: '' });
  if (!C[h]) {
    try {
      const r = await fetch('https://www.youtube.com/@' + h, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36', 'Accept-Language': 'pl,en;q=0.8', Cookie: 'CONSENT=YES+1; SOCS=CAI' }, signal: AbortSignal.timeout(8000) });
      const t = await r.text(), m = t.match(/"channelId":"(UC[\w-]{22})"/) || t.match(/channel\/(UC[\w-]{22})/);
      if (m) C[h] = m[1];
    } catch (e) {}
  }
  res.setHeader('Cache-Control', C[h] ? 's-maxage=86400' : 's-maxage=60');
  res.status(200).json({ id: C[h] || '' });
};
