const H = {
  apps: require('../lib/apps.js'),
  calendar: require('../lib/calendar.js'),
  imieniny: require('../lib/imieniny.js'),
  koszulka: require('../lib/koszulka.js'),
  live: require('../lib/live.js'),
  market: require('../lib/market.js'),
  planes: require('../lib/planes.js'),
  radio: require('../lib/radio.js'),
  rss: require('../lib/rss.js'),
  today: require('../lib/today.js'),
  trains: require('../lib/trains.js'),
  youtube: require('../lib/youtube.js'),
};
module.exports = (req, res) => {
  const n = String((req.query && req.query.name) || '').replace(/[^a-z]/g, '');
  if (!H[n]) return res.status(404).json({ error: 'nieznany endpoint' });
  return H[n](req, res);
};
