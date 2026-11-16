const LAT = 51.405, LON = 19.703, R = 30;
const SRC = ['https://api.airplanes.live/v2/point/', 'https://api.adsb.lol/v2/point/'];
const km = (a, b, c, d) => { const t = x => x * Math.PI / 180, h = Math.sin(t(c - a) / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(t(d - b) / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)); };
module.exports = async (req, res) => {
  let ac = null;
  for (const s of SRC) {
    try {
      const r = await fetch(s + LAT + '/' + LON + '/' + R, { headers: { 'User-Agent': 'pulpit' }, signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const j = await r.json(); ac = j.ac || j.aircraft;
      if (ac) break;
    } catch (e) {}
  }
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
  if (!ac) return res.status(200).json({ err: 1, p: [] });
  const p = ac.filter(a => a.lat != null && a.lon != null && a.alt_baro !== 'ground').map(a => ({
    f: (a.flight || '').trim() || a.r || a.hex, t: a.t || '', alt: Math.round((+a.alt_baro || 0) * 0.3048), gs: Math.round((a.gs || 0) * 1.852), tr: a.track || 0, la: a.lat, lo: a.lon, d: +km(LAT, LON, a.lat, a.lon).toFixed(1)
  })).sort((a, b) => a.d - b.d).slice(0, 40);
  res.status(200).json({ p });
};
