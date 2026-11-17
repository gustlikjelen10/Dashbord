const B = 'https://site.api.espn.com/apis/site/v2/sports/soccer/';
const SL = ['eng.1', 'esp.1', 'ger.1', 'ita.1', 'fra.1', 'pol.1', 'pol.2', 'uefa.champions', 'uefa.europa', 'uefa.europa.conf', 'uefa.nations', 'fifa.friendly'];
const ymd = d => d.toISOString().slice(0, 10).replace(/-/g, '');
async function sb(slug, from, to) {
  const r = await fetch(B + slug + '/scoreboard?dates=' + ymd(from) + '-' + ymd(to) + '&limit=300', { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(slug + ' HTTP ' + r.status);
  const j = await r.json(), lg = (j.leagues && j.leagues[0] && j.leagues[0].name) || slug;
  return (j.events || []).map(e => {
    const c = (e.competitions || [])[0]; if (!c) return null;
    const h = c.competitors.find(x => x.homeAway === 'home'), a = c.competitors.find(x => x.homeAway === 'away'); if (!h || !a) return null;
    const st = c.status.type.state;
    return { d: e.date, h: h.team.displayName, a: a.team.displayName, lg, s: st === 'in' ? 'LIVE' : st === 'post' ? 'FT' : 'NS', gh: st === 'pre' ? null : +h.score, ga: st === 'pre' ? null : +a.score };
  }).filter(Boolean);
}
module.exports = async (req, res) => {
  const l = req.query && req.query.l, now = new Date();
  try {
    let m;
    if (l) {
      if (!SL.includes(l)) return res.status(200).json({ m: [], err: 'Nieznana liga' });
      m = (await sb(l, now, new Date(now.getTime() + 10 * 864e5))).filter(x => x.s !== 'FT').sort((a, b) => a.d.localeCompare(b.d)).slice(0, 30);
    } else {
      const day = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' });
      const out = await Promise.allSettled(SL.map(s => sb(s, now, new Date(now.getTime() + 864e5))));
      m = out.filter(o => o.status === 'fulfilled').flatMap(o => o.value).filter(x => new Date(x.d).toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' }) === day).sort((a, b) => a.d.localeCompare(b.d));
    }
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
    res.status(200).json({ m, err: '' });
  } catch (e) { res.status(200).json({ m: [], err: e.message }); }
};
