const C = {};
const UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
  Cookie: 'CONSENT=YES+cb.20210328-17-p0.pl+FX+111; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMwODI5LjA3X3AxGgJwbCACGgYIgJnPpwY'
};
const get = async u => (await fetch(u, { headers: UA, signal: AbortSignal.timeout(7000) })).text();

const vidOf = t => {
  // 1. Bezpośredni canonical/og:url (gdy /live przekierowuje na konkretny stream)
  let m = t.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/)
    || t.match(/<meta property="og:url" content="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/)
    || t.match(/"videoDetails":\{"videoId":"([\w-]{11})"/);
  if (m) return m[1];

  // 2. Szukanie aktywnego kafelka LIVE na stronie /streams (często działa dla Sky News i webkamer!)
  const liveChunk = t.match(/"videoId":"([\w-]{11})"[\s\S]{0,1200}?"style":"LIVE"/);
  if (liveChunk) return liveChunk[1];

  const liveChunkRev = t.match(/"style":"LIVE"[\s\S]{0,1200}?"videoId":"([\w-]{11})"/);
  if (liveChunkRev) return liveChunkRev[1];

  return '';
};

const chanOf = t => {
  const m = t.match(/"channelId":"(UC[\w-]{22})"/)
    || t.match(/channel\/(UC[\w-]{22})/)
    || t.match(/"externalId":"(UC[\w-]{22})"/);
  return m ? m[1] : '';
};

module.exports = async (req, res) => {
  const h = String((req.query && req.query.h) || '').replace(/[^\w.-]/g, '');
  const v = String((req.query && req.query.v) || '').replace(/[^\w-]/g, '');
  const key = h || v;
  if (!key) return res.status(400).json({ id: '', vid: '' });

  let id = /^UC[\w-]{22}$/.test(h) ? h : (C[key] || '');
  let vid = '', live = false;

  try {
    if (!id && v && /^[\w-]{11}$/.test(v)) {
      const t = await get('https://www.youtube.com/watch?v=' + v);
      id = chanOf(t);
      if (id) C[v] = id;
    }

    if (!id && h) {
      const t = await get('https://www.youtube.com/@' + h);
      id = chanOf(t);
      if (id) C[h] = id;
    }

    const urls = id
      ? [
          'https://www.youtube.com/channel/' + id + '/live',
          'https://www.youtube.com/channel/' + id + '/streams'
        ]
      : (h ? ['https://www.youtube.com/@' + h + '/live', 'https://www.youtube.com/@' + h + '/streams'] : []);

    for (const u of urls) {
      const t = await get(u);
      const found = vidOf(t);
      if (found) {
        vid = found;
        live = true;
        break;
      }
    }

    // Ostatni ratunek: RSS kanału (często pierwszy wpis to aktualny live stream!)
    if (!vid && id) {
      const rx = await get('https://www.youtube.com/feeds/videos.xml?channel_id=' + id);
      const rm = rx.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/);
      if (rm) vid = rm[1];
    }
  } catch (e) {}

  if (!vid && v && /^[\w-]{11}$/.test(v)) vid = v;

  res.setHeader('Cache-Control', id || vid ? 's-maxage=60, stale-while-revalidate=300' : 's-maxage=10');
  res.status(200).json({ id: id || '', vid, live });
};
