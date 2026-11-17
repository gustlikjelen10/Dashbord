const CH = require('../channels.json');
const KEY = process.env.YT_API_KEY;
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36', 'Accept-Language': 'pl,en;q=0.8' };
const dec = s => (s || '').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(n)).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const m = (b, re) => { const x = b.match(re); return x ? x[1] : ''; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let LAST = null;
async function rss(q, name) {
  const r = await fetch('https://www.youtube.com/feeds/videos.xml?' + q, { headers: UA, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const x = await r.text();
  return (x.match(/<entry>[\s\S]*?<\/entry>/g) || []).slice(0, 3).map(b => ({
    c: name, t: dec(m(b, /<title>([\s\S]*?)<\/title>/)), l: m(b, /<link rel="alternate" href="([^"]+)"/),
    d: Date.parse(m(b, /<published>([^<]+)</)) || 0, i: m(b, /<media:thumbnail url="([^"]+)"/)
  }));
}
async function api(id, name) {
  const r = await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=3&playlistId=UU' + id.slice(2) + '&key=' + KEY, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('API ' + r.status);
  const j = await r.json();
  return (j.items || []).filter(i => i.snippet && i.snippet.resourceId).map(i => ({
    c: name, t: i.snippet.title, l: 'https://www.youtube.com/watch?v=' + i.snippet.resourceId.videoId,
    d: Date.parse(i.snippet.publishedAt) || 0, i: ((i.snippet.thumbnails || {}).medium || (i.snippet.thumbnails || {}).default || {}).url || ''
  }));
}
async function load([id, name]) {
  if (KEY) { try { return await api(id, name); } catch (e) {} }
  try { return await rss('channel_id=' + id, name); }
  catch (e) { await sleep(300); return await rss('playlist_id=UU' + id.slice(2), name); }
}
module.exports = async (req, res) => {
  const items = [], failed = []; let e = '';
  const size = KEY ? 10 : 6;
  for (let i = 0; i < CH.length; i += size) {
    const part = CH.slice(i, i + size);
    const out = await Promise.allSettled(part.map(load));
    out.forEach((o, k) => o.status === 'fulfilled' ? items.push(...o.value) : (failed.push(part[k][1]), e = e || String(o.reason && o.reason.message)));
    if (!KEY) await sleep(120);
  }
  items.sort((a, b) => b.d - a.d);
  let out = { items: items.slice(0, 40), failed, e };
  if (items.length) LAST = out; else if (LAST) out = { ...LAST, stale: true };
  res.setHeader('Cache-Control', out.items.length ? 's-maxage=3600, stale-while-revalidate=86400' : 's-maxage=60');
  res.status(200).json(out);
};
