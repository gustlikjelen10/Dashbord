const C = {};
const UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
  Cookie: 'CONSENT=YES+cb.20210328-17-p0.pl+FX+111; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMwODI5LjA3X3AxGgJwbCACGgYIgJnPpwY'
};
const get = async u => (await fetch(u, { headers: UA, signal: AbortSignal.timeout(7000) })).text();

const vidOf = t => {
  const m = t.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/)
    || t.match(/<meta property="og:url" content="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/)
    || t.match(/"videoDetails":\{"videoId":"([\w-]{11})"/);
  return m ? m[1] : '';
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
    // Jeśli podano videoId (np. s0Z4b4S0mdk dla webkamery), wyciągamy na stałe jego channelId!
    if (!id && v && /^[\w-]{11}$/.test(v)) {
      const t = await get('https://www.youtube.com/watch?v=' + v);
      id = chanOf(t);
      if (id) C[v] = id;
    }

    // Jeśli podano @handle (np. tvpinfo), wyciągamy channelId
    if (!id && h) {
      const t = await get('https://www.youtube.com/@' + h);
      id = chanOf(t);
      if (id) C[h] = id;
    }

    // Szukamy aktualnego videoId na kanale /live (opcjonalnie, bo embed/live_stream?channel=ID działa też bez tego)
    const urls = id
      ? ['https://www.youtube.com/channel/' + id + '/live']
      : (h ? ['https://www.youtube.com/@' + h + '/live'] : []);

    for (const u of urls) {
      const t = await get(u);
      const found = vidOf(t);
      if (found) {
        vid = found;
        live = /"isLiveNow":true|"isLive":true/.test(t);
        break;
      }
    }
  } catch (e) {}

  // Jeśli nie udało się złapać aktywnego live na kanale, a mamy fallback videoId (v), zwróć go
  if (!vid && v && /^[\w-]{11}$/.test(v)) vid = v;

  res.setHeader('Cache-Control', id || vid ? 's-maxage=60, stale-while-revalidate=300' : 's-maxage=10');
  res.status(200).json({ id: id || '', vid, live });
};
