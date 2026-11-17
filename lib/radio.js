let U = null;
module.exports = async (req, res) => {
  if (!U) {
    try {
      const r = await fetch('https://de1.api.radio-browser.info/json/stations/search?name=' + encodeURIComponent('Polskie Radio 24') + '&hidebroken=true&order=votes&reverse=true&limit=30', { headers: { 'User-Agent': 'pulpit/1.0' }, signal: AbortSignal.timeout(8000) });
      const l = await r.json();
      U = l.filter(s => /polskie\s*radio\s*24|pr24/i.test(s.name) && /^https:/i.test(s.url_resolved || s.url || '')).map(s => s.url_resolved || s.url).slice(0, 4);
    } catch (e) { U = null; }
  }
  res.setHeader('Cache-Control', U && U.length ? 's-maxage=86400' : 's-maxage=60');
  res.status(200).json({ urls: U || [] });
};
