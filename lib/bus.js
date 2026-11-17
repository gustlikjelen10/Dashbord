module.exports = async (req, res) => {
  try {
    const r = await fetch('https://piotrkow.kiedyprzyjedzie.pl/api/departures/899484:952553', { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }, signal: AbortSignal.timeout(7000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    res.status(200).json(await r.json());
  } catch (e) { res.status(200).json({ rows: [], err: e.message }); }
};
