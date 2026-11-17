const MN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
const find = o => {
  if (!o || typeof o !== 'object') return '';
  for (const k of Object.keys(o)) { const v = o[k]; if ((k === 'pl' || k === 'name_pl') && typeof v === 'string' && v) return v; }
  for (const k of Object.keys(o)) { const r = find(o[k]); if (r) return r; }
  return '';
};
module.exports = async (req, res) => {
  const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' }), [Y, M, D] = day.split('-').map(Number), err = [];
  const U = [
    'https://nameday.abalin.net/api/v2/today?country=pl&timezone=Europe/Warsaw',
    'https://nameday.abalin.net/api/V2/today?country=pl&timezone=Europe/Warsaw',
    'https://api.abalin.net/today?country=pl&timezone=Europe/Warsaw',
    'https://nameday.abalin.net/api/v2/date?date=' + day + '&country=pl',
    'https://nameday.abalin.net/api/V1/today?country=pl&timezone=Europe/Warsaw',
    'https://api.abalin.net/namedays?country=pl&month=' + M + '&day=' + D];
  let n = '', src = '';
  for (const u of U) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) });
      if (!r.ok) { err.push(new URL(u).host + ' ' + r.status); continue; }
      n = find(await r.json()); if (n) { src = new URL(u).host; break; }
      err.push(new URL(u).host + ' pusto');
    } catch (e) { err.push(new URL(u).host + ' ' + e.message); }
  }
  if (!n) {
    try {
      const r = await fetch('https://pl.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exsectionformat=wiki&titles=' + D + '_' + MN[M - 1] + '&format=json&formatversion=2', { signal: AbortSignal.timeout(6000) });
      const t = ((await r.json()).query.pages[0].extract) || '', m = t.match(/==\s*Imieniny\s*==([\s\S]*?)(?=\n==\s*[^=]|$)/i);
      if (m) { n = m[1].replace(/\n+/g, ' ').replace(/^Imieniny obchodzą:?\s*/i, '').trim().slice(0, 140); src = 'wikipedia'; } else err.push('wikipedia: brak sekcji');
    } catch (e) { err.push('wikipedia ' + e.message); }
  }
  res.setHeader('Cache-Control', n ? 's-maxage=3600' : 's-maxage=120');
  res.status(200).json({ n, src, err: [...new Set(err)].slice(0, 4) });
};
