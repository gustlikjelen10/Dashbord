const UA = { 'User-Agent': 'PulpitDashboard/1.0 (https://vercel.app)', Accept: 'application/sparql-results+json' };

const yd = (a, b) => {
  const A = new Date(a), B = new Date(b);
  let y = B.getUTCFullYear() - A.getUTCFullYear();
  if (b < Date.UTC(B.getUTCFullYear(), A.getUTCMonth(), A.getUTCDate())) y--;
  return [y, Math.round((b - Date.UTC(A.getUTCFullYear() + y, A.getUTCMonth(), A.getUTCDate())) / 864e5)];
};

const parseD = s => {
  if (!s) return null;
  const m = String(s).match(/^([+-]?\d{4,})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (y < 100 || mo < 1 || d < 1) return null;
  return Date.UTC(y, mo - 1, d);
};

let CACHE = { day: '', items: null };

module.exports = async (req, res) => {
  const T = new Date();
  const today = Date.UTC(T.getUTCFullYear(), T.getUTCMonth(), T.getUTCDate());
  const dayKey = T.toISOString().slice(0, 10);
  const born = Date.UTC(1986, 6, 12); // 1986-07-12
  const myDays = Math.round((today - born) / 864e5);

  if (CACHE.day === dayKey && CACHE.items && CACHE.items.length) {
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=172800');
    return res.status(200).json({ myDays, myYd: yd(born, today), items: CACHE.items, cached: true });
  }

  // Szukamy osób z polską Wikipedią, które żyły od (myDays - 1800) do (myDays - 1) dni
  const minDays = Math.max(5000, myDays - 1800);
  const maxDays = myDays - 1;

  const sparql = `
SELECT DISTINCT ?person ?personLabel ?personDescription ?birth ?death ?sitelinks WHERE {
  ?person wdt:P31 wd:Q5;
          wdt:P569 ?birth;
          wdt:P570 ?death;
          wikibase:sitelinks ?sitelinks.
  ?article schema:about ?person;
           schema:isPartOf <https://pl.wikipedia.org/>.
  FILTER(?sitelinks >= 15)
  FILTER(YEAR(?birth) >= 1500)
  BIND(FLOOR((?death - ?birth)) AS ?ageDays)
  FILTER(?ageDays >= ${minDays} && ?ageDays <= ${maxDays})
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pl,en". }
}
ORDER BY DESC(?ageDays) DESC(?sitelinks)
LIMIT 45
`.trim();

  try {
    const r = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(sparql), {
      headers: UA,
      signal: AbortSignal.timeout(12000)
    });
    if (!r.ok) throw new Error('Wikidata HTTP ' + r.status);
    const j = await r.json();
    const seen = new Set();
    const items = [];

    for (const b of (j.results && j.results.bindings) || []) {
      const name = b.personLabel && b.personLabel.value;
      if (!name || /^Q\d+$/.test(name) || seen.has(name)) continue;
      const bd = parseD(b.birth && b.birth.value);
      const dd = parseD(b.death && b.death.value);
      if (!bd || !dd) continue;
      const ad = Math.round((dd - bd) / 864e5);
      if (ad >= myDays || ad < minDays) continue;
      seen.add(name);
      items.push({
        n: name,
        d: (b.personDescription && b.personDescription.value) || 'znana postać',
        ad,
        a: yd(bd, dd),
        sl: +(b.sitelinks && b.sitelinks.value) || 0
      });
    }

    // Sortujemy od najstarszych wiekiem (najbliżej Twojego wieku), przy remisie wg popularności
    items.sort((a, b) => (b.ad - a.ad) || (b.sl - a.sl));
    const top = items.slice(0, 8);
    if (top.length >= 3) {
      CACHE = { day: dayKey, items: top };
    }
    res.setHeader('Cache-Control', top.length ? 's-maxage=86400, stale-while-revalidate=172800' : 's-maxage=300');
    return res.status(200).json({ myDays, myYd: yd(born, today), items: top });
  } catch (e) {
    res.setHeader('Cache-Control', 's-maxage=300');
    return res.status(200).json({ myDays, myYd: yd(born, today), items: [], err: e.message });
  }
};
