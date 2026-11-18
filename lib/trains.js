const API = 'https://kolej.live/api/?action=station&id=47704&date=';
const HD = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', Accept: 'application/json, text/plain, */*', 'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8', Referer: 'https://kolej.live/stacja/piotrkow-trybunalski/id_stacji/47704', Origin: 'https://kolej.live' };
const day = o => new Date(Date.now() + o * 864e5).toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' });
async function live(d) {
  const r = await fetch(API + d, { headers: HD, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('kolej.live HTTP ' + r.status);
  const j = await r.json();
  if (!Array.isArray(j.board)) throw new Error('kolej.live: nieznany format');
  return j.board.filter(x => x.kind === 'departure').map(x => ({
    t: x.actualTime || x.plannedTime, p: x.plannedTime, d: x.delayMinutes, n: x.label, to: x.destination, fr: x.origin,
    pl: x.platform, tr: x.track, st: x.status && x.status.label, cx: !!x.isCancelled
  }));
}
module.exports = async (req, res) => {
  const now = Date.now() - 60000;
  try {
    let l = (await live(day(0))).filter(x => Date.parse(x.t) >= now);
    if (l.length < 6) { try { l = l.concat(await live(day(1))); } catch (e) {} }
    l.sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(200).json({ live: true, dep: l.slice(0, 12) });
  } catch (e) {
    try {
      const st = require('./trains_static.js');
      let out = null;
      await st({ query: {} }, { setHeader() {}, status() { return { json: j => { out = j; } }; } });
      const dep = ((out && out.dep) || []).map(x => ({ t: null, hm: x.t, d: null, n: 'IC ' + x.n + ' ' + (x.nm || ''), to: x.b, pl: '', tr: '', st: 'rozkład', cx: false }));
      return res.status(200).json({ live: false, err: e.message, dep });
    } catch (e2) { return res.status(200).json({ live: false, err: e.message, dep: [] }); }
  }
};
