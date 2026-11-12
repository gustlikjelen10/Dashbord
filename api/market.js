const ST = [['PKN','Orlen','pkn'],['PKO','PKO BP','pko'],['PZU','PZU','pzu'],['DIAG','Diagnostyka','dia'],['DINO','Dino','dnp'],['DOMDEV','Develia','dom'],['ERSTE','Erste','ebs'],['ETFBTBSP','ETF BTBSP','etfbtbsp'],['IUSA','iShares S&P500','iusa.de'],['VUSA','Vanguard S&P500','vusa.de']];
const get = async u => { const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) }); if (!r.ok) throw new Error(u); return r; };
async function stock([k, n, s]) {
  const rows = (await (await get('https://stooq.pl/q/d/l/?s=' + s + '&i=d')).text()).trim().split('\n').slice(-2).map(l => l.split(','));
  const c = +rows[1][4], p = +rows[0][4];
  if (!c || !p) throw new Error(k);
  return { k, n, p: c, ch: (c / p - 1) * 100, d: rows[1][0] };
}
module.exports = async (req, res) => {
  const out = { fx: [], st: [], failed: [] };
  try {
    const t = await (await get('https://api.nbp.pl/api/exchangerates/tables/A/last/2/?format=json')).json();
    const [a, b] = t;
    ['EUR', 'USD', 'GBP', 'CHF'].forEach(c => { const x = a.rates.find(r => r.code === c), y = b.rates.find(r => r.code === c); if (x && y) out.fx.push({ c, v: y.mid, ch: (y.mid / x.mid - 1) * 100, d: b.effectiveDate }); });
  } catch (e) { out.failed.push('NBP'); }
  const r = await Promise.allSettled(ST.map(stock));
  r.forEach((o, i) => o.status === 'fulfilled' ? out.st.push(o.value) : out.failed.push(ST[i][0]));
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
  res.status(200).json(out);
};
