const ST = [['PKN','Orlen',['PKN.WA']],['PKO','PKO BP',['PKO.WA']],['PEKAO','Bank Pekao',['PEO.WA']],['PZU','PZU',['PZU.WA']],['DIAG','Diagnostyka',['DIA.WA']],['DINO','Dino',['DNP.WA']],['DOMDEV','Develia',['DOM.WA']],['ERSTE','Erste',['EBS.WA','EBS.VI']],['ETFBTBSP','ETF BTBSP',['ETFBTBSP.WA']],['IUSA','iShares Core S&P 500 Dist',['IUSA.DE']],['VUSA','Vanguard S&P500',['VUSA.DE']],['NVDA','NVIDIA',['NVDA']]];
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
  const out = { fx: [], cm: [], st: [], failed: [] };
  try {
    const [a, b] = await (await get('https://api.nbp.pl/api/exchangerates/tables/A/last/2/?format=json')).json();
    ['EUR', 'USD', 'GBP', 'CHF'].forEach(c => { const x = a.rates.find(r => r.code === c), y = b.rates.find(r => r.code === c); if (x && y) out.fx.push({ c, v: y.mid, ch: (y.mid / x.mid - 1) * 100, d: b.effectiveDate }); });
  } catch (e) { out.failed.push('NBP'); }
  try { const g = await (await get('https://api.nbp.pl/api/cenyzlota/last/2/?format=json')).json(); out.cm.push({ k: 'Złoto', v: g[1].cena, cur: 'zł/g', ch: (g[1].cena / g[0].cena - 1) * 100 }); } catch (e) { out.failed.push('Złoto'); }
  try { const c = (await (await get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=pln,usd&include_24hr_change=true')).json()).bitcoin; out.cm.push({ k: 'Bitcoin', v: c.pln, cur: 'zł', ch: c.pln_24h_change, usd: c.usd }); } catch (e) { out.failed.push('Bitcoin'); }
  const r = await Promise.allSettled(ST.map(stock));
  r.forEach((o, i) => o.status === 'fulfilled' ? out.st.push(o.value) : out.failed.push(ST[i][0]));
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
  res.status(200).json(out);
};
