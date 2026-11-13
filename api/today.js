const K = process.env.APIFOOTBALL_KEY;
const LG = new Set([39, 140, 135, 78, 61, 2, 3, 848, 106, 107, 1, 4, 5, 10, 32]);
module.exports = async (req, res) => {
  if (!K) return res.status(200).json({ off: true });
  try {
    const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' });
    const j = await (await fetch('https://v3.football.api-sports.io/fixtures?date=' + day + '&timezone=Europe/Warsaw', { headers: { 'x-apisports-key': K }, signal: AbortSignal.timeout(9000) })).json();
    const m = (j.response || []).filter(f => LG.has(f.league.id)).map(f => ({ d: f.fixture.date, h: f.teams.home.name, a: f.teams.away.name, lg: f.league.name, s: f.fixture.status.short, gh: f.goals.home, ga: f.goals.away })).sort((a, b) => a.d.localeCompare(b.d));
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    res.status(200).json({ m, err: j.errors && Object.keys(j.errors).length ? JSON.stringify(j.errors) : '' });
  } catch (e) { res.status(200).json({ m: [], err: e.message }); }
};
