const NX = { A: 'B', B: 'C', C: 'A' };
const get = async (u, h) => { const r = await fetch(u, { headers: h || {}, signal: AbortSignal.timeout(8000) }); if (!r.ok) throw new Error(r.status); return r.json(); };
module.exports = async (req, res) => {
  const out = {};
  try {
    const D = await get('https://silownia-v1.vercel.app/api/data', process.env.GYM_PIN ? { 'x-pin': process.env.GYM_PIN } : {});
    const days = [...new Set((D.s || []).map(x => x.d))].sort(), last = days[days.length - 1];
    const lp = last && [...D.s].reverse().find(x => x.d === last).p;
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(new Date());
    const dt = new Date(today + 'T12:00:00Z'); dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
    const ws = dt.toISOString().slice(0, 10);
    out.gym = { last: last ? { d: last, p: lp } : null, next: NX[lp] || 'A', week: days.filter(d => d >= ws && d <= today).length, month: days.filter(d => d.startsWith(today.slice(0, 7))).length, total: days.length };
  } catch (e) { out.gym = { err: String(e.message) }; }
  try { out.beer = (await get('https://piwko-eight.vercel.app/api/ranking')).map(u => ({ n: u.name, c: u.count, w: u.week, m: u.month })); } catch (e) { out.beer = []; }
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
  res.status(200).json(out);
};
