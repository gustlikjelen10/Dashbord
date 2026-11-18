const C = {};
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36', 'Accept-Language': 'pl,en;q=0.8', Cookie: 'CONSENT=YES+1; SOCS=CAI' };
const get = async u => (await fetch(u, { headers: UA, signal: AbortSignal.timeout(8000) })).text();
const vidOf = t => {
  const m = t.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/) || t.match(/<meta property="og:url" content="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/) || t.match(/"videoDetails":\{"videoId":"([\w-]{11})"/);
  return m ? m[1] : '';
};
module.exports = async (req, res) => {
  const h = String((req.query && req.query.h) || '').replace(/[^\w.-]/g, '');
  if (!h) return res.status(400).json({ id: '', vid: '' });
  let id = /^UC[\w-]{22}$/.test(h) ? h : C[h], vid = '', live = false;
  try {
    if (!id) { const t = await get('https://www.youtube.com/@' + h), m = t.match(/"channelId":"(UC[\w-]{22})"/) || t.match(/channel\/(UC[\w-]{22})/); if (m) C[h] = id = m[1]; }
    const urls = id ? ['https://www.youtube.com/channel/' + id + '/live', 'https://www.youtube.com/@' + h + '/live'] : [];
    for (const u of urls) { const t = await get(u); vid = vidOf(t); if (vid) { live = /"isLiveNow":true|"isLive":true/.test(t); break; } }
  } catch (e) {}
  res.setHeader('Cache-Control', vid ? 's-maxage=30' : 's-maxage=5');
  res.status(200).json({ id: id || '', vid, live });
};
