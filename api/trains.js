const U = 'https://www.europodroze.pl/dworzec-kolejowy/piotrkow-trybunalski/';
const lines = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '\n').replace(/\|/g, '\n').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').split('\n').map(s => s.trim()).filter(Boolean);
function parse(h) {
  const L = lines(h), out = [];
  for (let i = 0; i < L.length; i++) {
    if (!/^\d{2}:\d{2}$/.test(L[i])) continue;
    const [no, nm, a, d, b] = L.slice(i + 1, i + 6);
    if (/^\d{3,6}$/.test(no) && d === '-' && b) out.push({ t: L[i], n: no, nm, a, b });
  }
  return out;
}
module.exports = async (req, res) => {
  try {
    const [d, a] = await Promise.all(['odjazdy', 'przyjazdy'].map(async p => parse(await (await fetch(U + p, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) })).text())));
    const w = new Date().toLocaleTimeString('pl-PL', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit' });
    const nx = l => { const u = l.filter(x => x.t >= w), r = u.length < 6 ? u.concat(l.filter(x => x.t < w).map(x => ({ ...x, j: 1 }))) : u; return r.slice(0, 6); };
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=7200');
    res.status(200).json({ dep: nx(d), arr: nx(a) });
  } catch (e) { res.status(200).json({ dep: [], arr: [], err: e.message }); }
};
