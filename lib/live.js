const C = {};
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36', 'Accept-Language': 'pl,en;q=0.8', Cookie: 'CONSENT=YES+1; SOCS=CAI' };
const get = async u => { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(8000) }); return r.text(); };
module.exports = async (req, res) => {
  const h = String((req.query && req.query.h) || '').replace(/[^\w.-]/g, '');
  if (!h) return res.status(400).json({ id: '', vid: '' });
  let id = /^UC[\w-]{22}$/.test(h) ? h : C[h], vid = '';
  try {
    if (!id) { const t = await get('https://www.youtube.com/@' + h), m = t.match(/"channelId":"(UC[\w-]{22})"/) || t.match(/channel\/(UC[\w-]{22})/); if (m) C[h] = id = m[1]; }
    if (id) { const t = await get('https://www.youtube.com/channel/' + id + '/live'), m = t.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/); if (m) vid = m[1]; }
  } catch (e) {}
  res.setHeader('Cache-Control', 's-maxage=60');
  res.status(200).json({ id: id || '', vid });
};
