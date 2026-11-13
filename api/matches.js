const K = process.env.APIFOOTBALL_KEY, H = 'https://v3.football.api-sports.io';
const TEAMS = [['ŁKS Łódź', 'lks lodz', /^(lks|łks) (lodz|łódź)$/i, false], ['Legia Warszawa', 'legia', /^legia warszawa$/i, false], ['Polska', 'poland', /^poland$/i, true]];
const LG = new Set([39, 140, 135, 78, 61, 2, 3, 848, 106, 107, 1, 4, 5, 10, 32]);
const ids = {};
const api = async p => (await fetch(H + p, { headers: { 'x-apisports-key': K }, signal: AbortSignal.timeout(9000) })).json();
const fx = f => ({ d: f.fixture.date, h: f.teams.home.name, a: f.teams.away.name, lg: f.league.name, s: f.fixture.status.short, gh: f.goals.home, ga: f.goals.away });
module.exports = async (req, res) => {
  if (!K) return res.status(200).json({ off: true });
  const out = { teams: [], today: [], err: [] };
  const note = j => { const e = j.errors; if (e && (Array.isArray(e) ? e.length : Object.keys(e).length)) out.err.push(JSON.stringify(e)); };
  for (const [n, q, re, nat] of TEAMS) {
    try {
      if (!ids[n]) { const j = await api('/teams?search=' + encodeURIComponent(q)); note(j); const t = (j.response || []).find(x => re.test(x.team.name) && !!x.team.national === nat); if (t) ids[n] = t.team.id; }
      if (!ids[n]) { out.err.push('Nie znaleziono drużyny: ' + n); continue; }
      const j = await api('/fixtures?team=' + ids[n] + '&next=3&timezone=Europe/Warsaw'); note(j);
      out.teams.push({ n, m: (j.response || []).map(fx) });
    } catch (e) { out.err.push(n + ': ' + e.message); }
  }
  try {
    const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' });
    const j = await api('/fixtures?date=' + day + '&timezone=Europe/Warsaw'); note(j);
    out.today = (j.response || []).filter(f => LG.has(f.league.id)).map(fx).sort((a, b) => a.d.localeCompare(b.d)).slice(0, 30);
  } catch (e) { out.err.push('dzień: ' + e.message); }
  res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate=14400');
  res.status(200).json(out);
};
