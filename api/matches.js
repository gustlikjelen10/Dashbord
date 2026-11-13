const K = process.env.APIFOOTBALL_KEY, H = 'https://v3.football.api-sports.io';
const NOW = new Date(), SEA = NOW.getMonth() >= 6 ? NOW.getFullYear() : NOW.getFullYear() - 1;
const bad = /\b(ii|iii|w|u\d+|b)\b/i;
const TEAMS = [
  ['ŁKS Łódź', 'lks', t => /(lks|łks)/i.test(t.name) && /(lodz|łódź)/i.test(t.name) && !bad.test(t.name), false],
  ['Legia Warszawa', 'legia', t => /^legia\s+wars/i.test(t.name) && !bad.test(t.name), false],
  ['Polska', 'poland', t => /^poland$/i.test(t.name), true]];
const ids = {};
let lig = 0;
const api = async p => (await fetch(H + p, { headers: { 'x-apisports-key': K }, signal: AbortSignal.timeout(9000) })).json();
const iso = d => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' });
const fx = f => ({ d: f.fixture.date, h: f.teams.home.name, a: f.teams.away.name, lg: f.league.name, s: f.fixture.status.short, gh: f.goals.home, ga: f.goals.away });
module.exports = async (req, res) => {
  if (!K) return res.status(200).json({ off: true });
  const out = { teams: [], table: [], err: [] }, E = new Set();
  const note = j => { const e = j.errors; if (e && (Array.isArray(e) ? e.length : Object.keys(e).length)) E.add(JSON.stringify(e)); };
  for (const [n, q, ok, nat] of TEAMS) {
    try {
      if (!ids[n]) {
        const j = await api('/teams?search=' + q); note(j);
        const all = (j.response || []).map(x => x.team), t = all.find(t => t.country === 'Poland' && !!t.national === nat && ok(t));
        if (t) ids[n] = t.id; else { E.add('Nie znaleziono: ' + n + ' (wśród: ' + all.slice(0, 6).map(t => t.name).join(', ') + ')'); continue; }
      }
      let j = await api('/fixtures?team=' + ids[n] + '&next=4&timezone=Europe/Warsaw'); note(j);
      let l = j.response || [];
      if (!l.length) { j = await api('/fixtures?team=' + ids[n] + '&season=' + SEA + '&from=' + iso(NOW) + '&to=' + iso(new Date(Date.now() + 75 * 864e5)) + '&timezone=Europe/Warsaw'); note(j); l = j.response || []; }
      out.teams.push({ n, m: l.slice(0, 4).map(fx) });
    } catch (e) { E.add(n + ': ' + e.message); }
  }
  try {
    if (!lig) lig = 107;
    const j = await api('/standings?league=' + lig + '&season=' + SEA); note(j);
    const st = j.response && j.response[0] && j.response[0].league.standings[0];
    if (st) out.table = st.map(x => ({ r: x.rank, n: x.team.name, p: x.all.played, pts: x.points, gd: x.goalsDiff }));
  } catch (e) { E.add('tabela: ' + e.message); }
  out.err = [...E];
  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=43200');
  res.status(200).json(out);
};
