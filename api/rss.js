const FEEDS = [
  ['Money.pl','http://www.money.pl/rss/main.xml','kraj'],
  ['wnp.pl','http://www.wnp.pl/rss/serwis_rss.xml','kraj'],
  ['Polityka','http://www.polityka.pl/rss/articles.xml?list=72','kraj'],
  ['Wirtualnemedia','http://wirtualnemedia.pl/rss/wirtualnemedia_rss.xml','kraj'],
  ['Zero.pl','https://zero.pl/','kraj'],
  ['PAP','https://www.pap.pl/','kraj'],
  ['Onet','https://wiadomosci.onet.pl/.feed','kraj'],
  ['Legionisci','http://legionisci.com/rss/newsy.xml','pilka'],
  ['Legia.Net','https://legia.net/rss','pilka'],
  ['Legia TV','https://www.youtube.com/feeds/videos.xml?channel_id=UC1uq_GHtFPL6MrJZBU4LnsQ','pilka'],
  ['Goal.pl','https://www.goal.pl/feed/','pilka'],
  ['Footy Headlines','http://www.footyheadlines.com/feeds/posts/default','pilka'],
  ['Wyborcza Kultura','http://rss.gazeta.pl/pub/rss/gazetawyborcza_kultura.xml','kultura'],
  ['Filmweb','http://www.filmweb.pl/rss/news','kultura'],
  ['Serialowa','http://www.serialowa.pl/feed/','kultura'],
  ['GlamRap','https://glamrap.pl/feed/','kultura'],
  ['Spider\'s Web','http://www.spidersweb.pl/feed','kultura'],
  ['Łowcy Gier','http://lowcygier.pl/darmowe/feed/','okazje'],
  ['LowcyChin','https://www.lowcychin.pl/feed/','okazje'],
  ['Kanał Wyjazdowy','https://kanalwyjazdowy.pl/feed/','okazje'],
];
const FIX = new Set(['wnp.pl']);
const off = t => new Date(new Date(t).toLocaleString('en-US', { timeZone: 'Europe/Warsaw' })) - new Date(new Date(t).toLocaleString('en-US', { timeZone: 'UTC' }));
const clean = s => (s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, '')
  .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(n))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .trim();
const tag = (b, t) => { const m = b.match(new RegExp('<' + t + '[^>]*>([\\s\\S]*?)</' + t + '>', 'i')); return m ? clean(m[1]) : ''; };
const link = b => {
  const t = b.match(/<link>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)/i);
  if (t) return t[1];
  const a = b.match(/<link[^>]*href="([^"]+)"/i);
  return a ? a[1] : '';
};
const img = b => { const m = b.match(/<media:(?:thumbnail|content)[^>]*url="([^"]+)"/i) || b.match(/<enclosure[^>]*url="([^"]+\.(?:jpe?g|png|webp)[^"]*)"/i) || b.match(/<img[^>]*src=["']([^"']+)["']/i) || b.match(/&lt;img[^&]*src=["']([^"']+)["']/i); return m ? m[1].replace(/&amp;/g, '&') : ''; };
async function load([n, u, c]) {
  const get = async url => { const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 PulpitBot' }, signal: AbortSignal.timeout(8000) }); if (!r.ok) throw new Error(n); return r.text(); };
  let x = await get(u);
  if (!/<(item|entry)[\s>]/i.test(x)) {
    const t = x.match(/<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*>/i);
    const h = t && t[0].match(/href=["']([^"']+)["']/);
    if (!h) throw new Error(n);
    x = await get(new URL(h[1], u).href);
  }
  const blocks = x.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || [];
  return blocks.slice(0, 15).map(b => {
    let d = Date.parse(tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date')) || 0;
    if (d && (FIX.has(n) || d > Date.now() + 3e5)) d -= off(d);
    return { s: n, c, t: tag(b, 'title'), l: link(b), d, i: img(b) };
  }).filter(i => i.t && i.l);
}
module.exports = async (req, res) => {
  const out = await Promise.allSettled(FEEDS.map(load));
  const items = [], failed = [];
  out.forEach((o, i) => o.status === 'fulfilled' ? items.push(...o.value) : failed.push(FEEDS[i][0]));
  items.sort((a, b) => b.d - a.d);
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
  res.status(200).json({ items: items.slice(0, 120), failed });
};
