const CH = require('../channels.json');
const dec = s => (s || '').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(n)).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const m = (b, re) => { const x = b.match(re); return x ? x[1] : ''; };
async function load([id, name]) {
  const r = await fetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + id, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(name);
  const x = await r.text();
  return (x.match(/<entry>[\s\S]*?<\/entry>/g) || []).slice(0, 3).map(b => ({
    c: name, t: dec(m(b, /<title>([\s\S]*?)<\/title>/)), l: m(b, /<link rel="alternate" href="([^"]+)"/),
    d: Date.parse(m(b, /<published>([^<]+)</)) || 0, i: m(b, /<media:thumbnail url="([^"]+)"/)
  }));
}
module.exports = async (req, res) => {
  const out = await Promise.allSettled(CH.map(load));
  const items = [], failed = [];
  out.forEach((o, i) => o.status === 'fulfilled' ? items.push(...o.value) : failed.push(CH[i][1]));
  items.sort((a, b) => b.d - a.d);
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  res.status(200).json({ items: items.slice(0, 40), failed });
};
