const ical = require('node-ical');
module.exports = async (req, res) => {
  const u = process.env.ICAL_URL;
  if (!u) return res.status(200).json({ off: true });
  try {
    const txt = await (await fetch(u, { signal: AbortSignal.timeout(8000) })).text();
    const data = ical.sync.parseICS(txt);
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const to = new Date(from.getTime() + 8 * 864e5);
    const ev = [];
    for (const k in data) {
      const e = data[k];
      if (e.type !== 'VEVENT' || !e.start) continue;
      const a = e.datetype === 'date', dur = e.end ? e.end - e.start : 0;
      const push = s => ev.push({ t: e.summary || '', s: new Date(s).toISOString(), a, l: e.location || '' });
      if (e.rrule) {
        const ex = Object.keys(e.exdate || {});
        e.rrule.between(from, to, true).forEach(d => { if (!ex.includes(d.toISOString().slice(0, 10))) push(d); });
      } else if (new Date(e.start) < to && new Date(e.start.getTime() + dur) >= from) push(e.start);
    }
    ev.sort((x, y) => x.s.localeCompare(y.s));
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
    res.status(200).json({ ev: ev.slice(0, 25) });
  } catch (e) { res.status(200).json({ err: true }); }
};
