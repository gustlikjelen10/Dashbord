const ST = [['PKN','Orlen',['PKN.WA']],['PKO','PKO BP',['PKO.WA']],['PZU','PZU',['PZU.WA']],['DIAG','Diagnostyka',['DIA.WA']],['DINO','Dino',['DNP.WA']],['DOMDEV','Develia',['DOM.WA']],['ERSTE','Erste',['EBS.WA','EBS.VI']],['ETFBTBSP','ETF BTBSP',['ETFBTBSP.WA']],['IUSA','iShares S&P500',['IUSA.DE']],['VUSA','Vanguard S&P500',['VUSA.DE']]];
const get = async u => { const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' }, signal: AbortSignal.timeout(8000) }); if (!r.ok) throw new Error(u); return r; };
async function one(y) {
  const j = await (await get('https://query1.finance.yahoo.com/v8/finance/chart/' + y + '?range=5d&interval=1d')).json();
  const r = j.chart.result[0], cl = r.indicators.quote[0].close.filter(v => v != null), p = r.meta.regularMarketPrice, prev = cl[cl.length - 2];
  if (!p || !prev) throw new Error(y);
  return { p, ch: (p / prev - 1) * 100, cur: r.meta.currency, t: (r.meta.regularMarketTime || 0) * 1000 };
}
async function stock([k, n, ys]) {
  for (const y of ys) { try { return { k, n, ...(await one(y)) }; } catch (e) {} }
  throw new Error(k);
}
module.exports = async (req, res) => {
  const out = { fx: [], st: [], failed: [] };
  try {
    const [a, b] = await (await get('https://api.nbp.pl/api/exchangerates/tables/A/last/2/?format=json')).json();
    ['EUR', 'USD', 'GBP', 'CHF'].forEach(c => { const x = a.rates.find(r => r.code === c), y = b.rates.find(r => r.code === c); if (x && y) out.fx.push({ c, v: y.mid, ch: (y.mid / x.mid - 1) * 100, d: b.effectiveDate }); });
  } catch (e) { out.failed.push('NBP'); }
  const r = await Promise.allSettled(ST.map(stock));
  r.forEach((o, i) => o.status === 'fulfilled' ? out.st.push(o.value) : out.failed.push(ST[i][0]));
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
  res.status(200).json(out);
};
