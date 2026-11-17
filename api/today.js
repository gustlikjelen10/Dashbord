const B = 'https://site.api.espn.com/apis/site/v2/sports/soccer/';
const SL = ['eng.1', 'esp.1', 'ger.1', 'ita.1', 'fra.1', 'uefa.champions', 'uefa.europa', 'uefa.europa.conf', 'uefa.nations', 'fifa.friendly', 'uefa.euroq', 'fifa.worldq.uefa'];
const H = { 'User-Agent': 'Mozilla/5.0' };
const ymd = d => d.toISOString().slice(0, 10).replace(/-/g, '');
const wday = d => new Date(d).toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' });
async function sb(slug, from, to) {
  const r = await fetch(B + slug + '/scoreboard?dates=' + ymd(from) + '-' + ymd(to) + '&limit=300', { headers: H, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(slug + ' HTTP ' + r.status);
  const j = await r.json(), lg = (j.leagues && j.leagues[0] && j.leagues[0].name) || slug;
  return (j.events || []).map(e => {
    const c = (e.competitions || [])[0]; if (!c) return null;
    const h = c.competitors.find(x => x.homeAway === 'home'), a = c.competitors.find(x => x.homeAway === 'away'); if (!h || !a) return null;
    const st = c.status.type.state;
    return { d: e.date, h: h.team.displayName, a: a.team.displayName, lg, s: st === 'in' ? 'LIVE' : st === 'post' ? 'FT' : 'NS', gh: st === 'pre' ? null : +h.score, ga: st === 'pre' ? null : +a.score };
  }).filter(Boolean);
}
const OK = /friendl|nations|qualif|world cup|euro|premier|la liga|serie a|bundesliga|ligue 1|ekstraklasa|polish|champions|europa|conference/i;
const T = 'https://www.thesportsdb.com/api/v1/json/123/';
async function tj(p) {
  const r = await fetch(T + p, { headers: H, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('TheSportsDB HTTP ' + r.status);
  return r.json();
}
const mapT = e => {
  const d = e.strTimestamp ? e.strTimestamp + 'Z' : e.dateEvent + 'T' + (e.strTime || '00:00:00') + 'Z', s = String(e.strStatus || '');
  const st = /finish|^FT|^AET|^PEN/i.test(s) ? 'FT' : /not started|^NS|^$|postp/i.test(s) ? 'NS' : 'LIVE';
  return { d, h: e.strHomeTeam, a: e.strAwayTeam, lg: e.strLeague, s: st, gh: e.intHomeScore == null ? null : +e.intHomeScore, ga: e.intAwayScore == null ? null : +e.intAwayScore };
};
module.exports = async (req, res) => {
  const l = String((req.query && req.query.l) || ''), now = new Date(), errs = [];
  try {
    let m = [];
    if (l.startsWith('tsdb:')) {
      const id = l.slice(5).replace(/\D/g, ''), y = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
      let ev = [];
      try { ev = (await tj('eventsnextleague.php?id=' + id)).events || []; } catch (e) { errs.push(e.message); }
      if (!ev.length) { try { ev = (await tj('eventsseason.php?id=' + id + '&s=' + y + '-' + (y + 1))).events || []; } catch (e) { errs.push(e.message); } }
      m = ev.map(mapT).filter(x => new Date(x.d) > new Date(now.getTime() - 3 * 36e5)).sort((a, b) => a.d.localeCompare(b.d)).slice(0, 12);
    } else if (l) {
      if (!SL.includes(l)) return res.status(200).json({ m: [], err: 'Nieznana liga' });
      m = (await sb(l, now, new Date(now.getTime() + 10 * 864e5))).filter(x => x.s !== 'FT').sort((a, b) => a.d.localeCompare(b.d)).slice(0, 30);
    } else {
      const day = wday(now);
      const out = await Promise.allSettled(SL.map(s => sb(s, now, new Date(now.getTime() + 864e5))));
      out.forEach(o => { if (o.status === 'rejected') errs.push(o.reason.message); });
      m = out.filter(o => o.status === 'fulfilled').flatMap(o => o.value).filter(x => wday(x.d) === day);
      try {
        const t = ((await tj('eventsday.php?d=' + day + '&s=Soccer')).events || []).filter(e => OK.test(e.strLeague || '')).map(mapT).filter(x => wday(x.d) === day);
        const key = x => (x.h + x.a).toLowerCase().replace(/[^a-z]/g, ''), seen = new Set(m.map(key));
        t.forEach(x => { if (!seen.has(key(x))) m.push(x); });
      } catch (e) { errs.push(e.message); }
      m.sort((a, b) => a.d.localeCompare(b.d));
    }
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
    res.status(200).json({ m, err: m.length ? '' : errs.slice(0, 3).join(' | ') });
  } catch (e) { res.status(200).json({ m: [], err: e.message }); }
};
