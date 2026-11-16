const U = process.env.SUPABASE_URL || 'https://hlopkdnxwemnqxzglpvl.supabase.co';
const K = process.env.SUPABASE_ANON_KEY || 'sb_publishable_cLpWKBR9p_adDMtzca1pTw_-iCy0Gej';
const pic = p => !p ? '' : /^https?:/.test(p) ? p : U + '/storage/v1/object/public/jersey-photos/' + p.replace(/^\/+/, '');
module.exports = async (req, res) => {
  try {
    const r = await fetch(U + '/rest/v1/jerseys?select=*&order=created_at.desc,id.desc&limit=1', { headers: { apikey: K, Prefer: 'count=exact' }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(r.status);
    const j = (await r.json())[0] || null, n = +((r.headers.get('content-range') || '').split('/')[1]) || 0;
    if (j) j.img = pic(j.photo_front_url);
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
    res.status(200).json({ j, n });
  } catch (e) { res.status(200).json({ err: String(e.message) }); }
};
