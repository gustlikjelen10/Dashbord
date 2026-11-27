module.exports = async (req, res) => {
  try {
    const r = await fetch('https://danepubliczne.imgw.pl/api/data/warningsmeteo', { headers: { 'User-Agent': 'pulpit-dashboard/1.0', Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error('IMGW HTTP ' + r.status);
    const j = await r.json(), arr = Array.isArray(j) ? j : (j.warnings || j.data || []);
    const nowW = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Warsaw' });
    const f = s => { const m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/); return m ? m[3] + '.' + m[2] + ' ' + m[4] + ':' + m[5] : ''; };
    const items = arr.filter(w => {
      const codes = [].concat(w.teryt || []).map(String), txt = JSON.stringify(w);
      const here = codes.some(c => c.startsWith('1011') || c.startsWith('1062')) || /piotrk/i.test(txt);
      const to = String(w.obowiazuje_do || '').slice(0, 19).replace('T', ' ');
      return here && (!to || to > nowW);
    }).map(w => ({ e: w.nazwa_zdarzenia || 'ostrzeżenie', s: +w.stopien || 1, p: +w.prawdopodobienstwo || 0, from: f(w.obowiazuje_od), to: f(w.obowiazuje_do), t: String(w.tresc || '').slice(0, 200) }))
      .sort((a, b) => b.s - a.s);
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    res.status(200).json({ ok: true, items, total: arr.length });
  } catch (e) { res.setHeader('Cache-Control', 's-maxage=60'); res.status(200).json({ ok: false, items: [], err: e.message }); }
};
